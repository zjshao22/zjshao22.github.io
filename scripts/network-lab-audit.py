"""Exercise the same static export locally and on GitHub Pages with Chrome."""

import argparse
import hashlib
import json
import struct
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--base-url", required=True)
parser.add_argument("--output", type=Path, required=True)
parser.add_argument(
    "--browser",
    default="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
)
args = parser.parse_args()
base = args.base_url.rstrip("/")
lab = base + "/network-lab/"
args.output.mkdir(parents=True, exist_ok=True)
errors, failures, requests, checks, presets, cancelled = [], [], [], [], [], []


def capture_fixtures(folder):
    """Independent, constructed RAW IPv4/UDP DNS query in pcap and pcapng."""
    dns = struct.pack("!6H", 0x1234, 0x100, 1, 0, 0, 0)
    dns += b"\x07example\x04test\0" + struct.pack("!HH", 1, 1)
    udp = struct.pack("!4H", 53000, 53, 8 + len(dns), 0) + dns
    ip = struct.pack(
        "!BBHHHBBH4s4s", 0x45, 0, 20 + len(udp), 1, 0x4000,
        64, 17, 0, bytes([192, 0, 2, 4]), bytes([198, 51, 100, 9]),
    )
    checksum = sum(struct.unpack("!10H", ip))
    while checksum >> 16:
        checksum = (checksum & 65535) + (checksum >> 16)
    ip = ip[:10] + struct.pack("!H", (~checksum) & 65535) + ip[12:]
    raw = ip + udp
    pcap = struct.pack("<IHHIIII", 0xA1B2C3D4, 2, 4, 0, 0, 65535, 101)
    pcap += struct.pack("<4I", 1, 123456, len(raw), len(raw)) + raw
    section = struct.pack("<IIIHHqI", 0x0A0D0D0A, 28, 0x1A2B3C4D, 1, 0, -1, 28)
    interface = struct.pack("<IIHHII", 1, 20, 101, 0, 65535, 20)
    padded = raw + b"\0" * ((-len(raw)) % 4)
    size = 32 + len(padded)
    enhanced = struct.pack("<7I", 6, size, 0, 0, 1123456, len(raw), len(raw))
    enhanced += padded + struct.pack("<I", size)
    paths = []
    for name, data in [("constructed.pcap", pcap), ("constructed.pcapng", section + interface + enhanced)]:
        path = folder / name
        path.write_bytes(data)
        paths.append(path)
    return paths


with tempfile.TemporaryDirectory(prefix="network-lab-audit-") as temporary:
    files = Path(temporary)
    fixtures = capture_fixtures(files)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=args.browser)
        context = browser.new_context(viewport={"width": 1440, "height": 1000}, accept_downloads=True)
        context.on("page", lambda page: page.on("pageerror", lambda error: errors.append(str(error))))
        page = context.new_page()
        page.on("request", lambda r: requests.append({"url": r.url, "method": r.method}))
        def request_failed(request):
            entry = {"url": request.url, "error": request.failure}
            # Leaving a Next.js page or HTTP/1.0 backlog saturation cancels speculative course prefetches.
            if not request.url.startswith(lab) and any(
                code in (request.failure or "")
                for code in (
                    "ERR_ABORTED",
                    "ERR_CONNECTION_RESET",
                    "ERR_SOCKET_NOT_CONNECTED",
                    "ERR_NETWORK_IO_SUSPENDED",
                    "ERR_PROXY_CONNECTION_FAILED",
                    "ERR_INTERNET_DISCONNECTED",
                )
            ):
                cancelled.append(entry)
            else:
                failures.append(entry)

        page.on("requestfailed", request_failed)
        bad_responses = []
        page.on("response", lambda r: bad_responses.append({"url": r.url, "status": r.status}) if r.status >= 400 else None)

        # Real navigation from the retained home page and shared course navigation.
        page.goto(base + "/", wait_until="networkidle")
        expect(page.locator("h1")).to_contain_text("从一个问题开始")
        expect(page.get_by_role("link", name="打开网络实验台", exact=True)).to_be_visible()
        page.get_by_role("link", name="打开网络实验台", exact=True).click()
        page.wait_for_function("!!window.NetworkLab")
        page.goto(base + "/docs/network/", wait_until="networkidle")
        with context.expect_page() as popup:
            page.get_by_role("link", name="打开网络实验台 →", exact=True).click()
        child = popup.value
        child.wait_for_function("!!window.NetworkLab")
        child.close()
        expect(page.get_by_role("link", name="网络实验台", exact=True).first).to_be_visible()
        checks.append("Home, shared navigation and network course entries; existing course remains available")

        page.goto(lab, wait_until="networkidle")
        page.wait_for_function("!!window.NetworkLab")
        expect(page.locator("#preset option")).to_have_count(18)
        expect(page.locator("[data-flow-node=kernel]")).to_be_visible()
        assert page.locator(".playback-panel").evaluate("e => getComputedStyle(e).fontSize") == "18px"
        resource_urls = page.locator("script[src],link[rel=stylesheet]").evaluate_all(
            "els => els.map(el => el.src || el.href)"
        )
        for url in resource_urls:
            assert url.startswith(lab), url
            response = context.request.get(url)
            assert response.status == 200, (url, response.status)
        checks.append("Independent subdirectory loads all scripts/styles locally with HTTP 200 and original 18px body text")

        for key in page.locator("#preset option").evaluate_all("els => els.map(el => el.value)"):
            page.select_option("#preset", key)
            page.locator("#run").click()
            page.locator("#end").click()
            result = page.evaluate("({id:NetworkLab.config.presetId, expected:NetworkLab.config.lesson.expected, code:NetworkLab.run.result.code, events:NetworkLab.run.events.length})")
            assert result["code"] == result["expected"], result
            presets.append(result)
        checks.append("All 18 presets compute the expected success or fault result")

        page.select_option("#preset", "tun")
        page.locator("#run").click()
        page.locator("#zoom-in").click()
        view = page.evaluate("JSON.stringify(NetworkLab.view)")
        for _ in range(5):
            page.locator("#next").click()
        position = page.evaluate("NetworkLab.index")
        page.select_option("#speed", "150")
        page.locator("#play").click()
        page.wait_for_timeout(750)
        page.locator("#play").click()
        assert page.evaluate("NetworkLab.index") > position
        assert page.evaluate("JSON.stringify(NetworkLab.view)") == view
        expect(page.locator("#step-spotlight")).to_contain_text("当前四元组")
        expect(page.locator("#live-dock")).to_contain_text("拆开当前信封")
        assert page.locator("#phase-bar .phase-pill").count() >= 3
        page.locator("#phase-bar .phase-pill").nth(2).click()
        assert page.evaluate("JSON.stringify(NetworkLab.view)") == view
        expect(page.locator("#live-dock")).to_contain_text("代理分流判断")
        page.locator("#back").click()
        page.locator("#event-count").click()
        page.locator(".timeline-event").last.click()
        expect(page.locator("#step-spotlight")).to_contain_text("动手验证")
        assert page.evaluate("JSON.stringify(NetworkLab.view)") == view
        checks.append("Step, play/pause, phase jump, inline spotlight diff/tuple/tryIt and timeline replay preserve manual pan/zoom")

        page.locator("#packet-atlas-toggle").click()
        assert page.locator(".atlas-packet").count() == page.evaluate("Object.keys(NetworkLab.run.final.packets).length")
        page.locator(".atlas-packet").first.click()
        expect(page.locator("#inspector-body")).to_contain_text("IPv4 首部")
        assert not page.locator("#inspector").evaluate('e => e.matches(":modal")')
        page.locator('[data-tab="state"]').click()
        expect(page.locator("#inspector-body")).to_contain_text("TCP 连接与状态")
        heading = page.locator("#inspector .dialog-heading").bounding_box()
        before = page.locator("#inspector").bounding_box()
        page.mouse.move(heading["x"] + 60, heading["y"] + 12)
        page.mouse.down()
        page.mouse.move(heading["x"] + 110, heading["y"] + 35, steps=4)
        page.mouse.up()
        after = page.locator("#inspector").bounding_box()
        assert after["x"] != before["x"] or after["y"] != before["y"]
        assert page.locator("#inspector").evaluate('e => getComputedStyle(e).resize') == "both"
        page.locator('#inspector [aria-label="最小化或还原窗口"]').click()
        expect(page.locator("#inspector")).to_have_class(__import__("re").compile("window-minimized"))
        page.locator('#inspector [aria-label="最小化或还原窗口"]').click()
        page.keyboard.press("Escape")
        page.locator("#packet-atlas-toggle").click()
        assert page.evaluate("JSON.stringify(NetworkLab.view)") == view
        checks.append("All-packet and connection/state inspection; draggable, minimizable, resizable modeless windows")

        # Change the actual configuration through the device editor, persist, reload and rerun.
        page.locator("#network-edit-toggle").click()
        page.locator('[data-host="client"]').click()
        route = page.locator("[data-route]").filter(has=page.locator('[data-key="prefix"][value="203.0.113.10/32"]'))
        route.locator("[data-remove]").click()
        page.locator('#editor-form button[type="submit"]').click()
        page.locator("#run").click()
        assert page.evaluate("NetworkLab.run.result.code") == "TUN_LOOP"
        page.reload(wait_until="networkidle")
        page.locator("#run").click()
        assert page.evaluate("NetworkLab.run.result.code") == "TUN_LOOP"
        page.locator("#reset-preset").click()
        page.locator("#run").click()
        assert page.evaluate("NetworkLab.run.result.code") == "SUCCESS"
        checks.append("Deleting proxy /32 route changes SUCCESS to TUN_LOOP; auto-save survives refresh; restoring fixes it")

        page.locator("#request-settings").click()
        page.locator('[name="fault-dropFirst"]').check()
        page.locator('#editor-form button[type="submit"]').click()
        page.locator("#run").click()
        assert page.evaluate("NetworkLab.run.final.metrics.retransmissions") == 1
        page.locator("#reset-preset").click()
        page.locator("#network-edit-toggle").click()
        page.locator("#edit-links").click()
        page.locator("[data-edit-link]").first.click()
        page.locator('[name="enabled"]').uncheck()
        page.locator('#editor-form button[type="submit"]').click()
        page.locator("#run").click()
        assert not page.evaluate("NetworkLab.run.result.ok")
        page.locator("#reset-preset").click()
        page.locator("#add-host").click()
        page.locator('#editor-form button[type="submit"]').click()
        assert page.evaluate("NetworkLab.config.hosts.length") == 8
        page.locator('[data-host="host1"]').click()
        page.locator('[name="host-name"]').fill("部署验收设备")
        page.locator('#editor-form button[type="submit"]').click()
        assert page.evaluate('NetworkLab.config.hosts.find(h => h.id === "host1").name') == "部署验收设备"
        page.locator('[data-host="host1"]').click()
        page.locator("#delete-host").click()
        assert page.evaluate("NetworkLab.config.hosts.length") == 7
        page.locator("#network-edit-toggle").click()
        checks.append("Device add/edit/delete, link failure editor and packet-loss setting affect computed state")

        page.locator("#run").click()
        page.locator("#end").click()
        exported = {}
        for button in ["save-config", "export-trace", "export-pcap"]:
            page.locator("#workbench-menu-toggle").click()
            with page.expect_download() as download:
                page.locator("#" + button).click()
            path = files / download.value.suggested_filename
            download.value.save_as(path)
            assert path.stat().st_size > 24
            exported[button] = path
        assert exported["export-pcap"].name.startswith("SIMULATED")
        trace = json.loads(exported["export-trace"].read_text())
        assert trace["source"] == "simulation" and "state" in trace["events"][-1]
        page.locator("#config-file").set_input_files(exported["save-config"])
        page.wait_for_function("NetworkLab.run === null")
        page.locator("#config-file").set_input_files(exported["export-trace"])
        page.wait_for_function("NetworkLab.run && NetworkLab.run.result.ok")
        assert page.evaluate("NetworkLab.run.events.length") == len(trace["events"])
        checks.append("JSON config and run record export/import; deterministic full replay; SIMULATED pcap download")

        page.locator("#capture-tab").click()
        for path in [exported["export-pcap"], *fixtures]:
            before_requests = len(requests)
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            page.locator("#capture-file").set_input_files(path)
            expect(page.locator("#capture-name")).to_contain_text(path.name)
            expect(page.locator("#capture-count")).not_to_have_text("0 个分组")
            page.locator("#capture-rows [data-capture]").first.click()
            expect(page.locator("#inspector-kicker")).to_contain_text("LOCAL CAPTURE")
            expect(page.locator("#inspector-body")).to_contain_text("原始捕获字节")
            if path in fixtures:
                expect(page.locator("#capture-count")).to_have_text("1 个分组")
                expect(page.locator("#inspector-body")).to_contain_text("192.0.2.4")
                expect(page.locator("#inspector-body")).to_contain_text("example.test")
            page.keyboard.press("Escape")
            assert hashlib.sha256(path.read_bytes()).hexdigest() == digest
            assert len(requests) == before_requests, requests[before_requests:]
        page.locator("#capture-filter").fill("DNS")
        expect(page.locator("#capture-rows tr")).to_have_count(1)
        page.locator("#capture-filter").fill("does-not-match")
        expect(page.locator("#capture-rows tr")).to_have_count(0)
        page.reload(wait_until="networkidle")
        expect(page.locator("#capture-view")).to_be_visible()
        checks.append("Local pcap and pcapng parsing/filter/hex inspection; input files unchanged and zero network requests during parsing; #capture refresh")

        page.goto(lab + "guide.html#capture", wait_until="networkidle")
        expect(page.locator("#capture-view")).to_be_visible()
        assert "/network-lab/index.html#capture" in page.url
        page.goto(lab, wait_until="networkidle")
        page.locator("#run").click()
        for _ in range(4):
            page.locator("#next").click()
        page.screenshot(path=str(args.output / "network-lab.png"), full_page=True)
        for width, height in [(1280, 720), (747, 748), (390, 844)]:
            page.set_viewport_size({"width": width, "height": height})
            page.wait_for_timeout(100)
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
            view = page.evaluate("JSON.stringify(NetworkLab.view)")
            page.locator("#next").click()
            assert page.evaluate("JSON.stringify(NetworkLab.view)") == view
        checks.append("Legacy guide redirect, direct refresh and stable layout/playback at 1280, 747 and 390px")
        assert not errors, errors
        assert not bad_responses, bad_responses
        assert not failures, failures
        runtime = [r for r in requests if r["url"].startswith(lab)]
        assert all(r["method"] == "GET" for r in runtime), runtime
        assert all(r["method"] in ("GET", "HEAD") for r in requests), requests
        assert all(urlsplit(r["url"]).netloc == urlsplit(base).netloc for r in requests if r["url"].startswith("http")), requests
        context.close()
        browser.close()

report = {
    "result": "PASS", "url": lab,
    "verified_at": datetime.now(timezone.utc).isoformat(),
    "browser": args.browser, "checks": checks, "presets": presets,
    "runtime_resources": resource_urls, "page_errors": errors,
    "http_errors": bad_responses, "failed_requests": failures,
    "cancelled_course_prefetches": cancelled,
    "runtime_request_methods": sorted(set(r["method"] for r in runtime)),
}
(args.output / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(report, ensure_ascii=False, indent=2))

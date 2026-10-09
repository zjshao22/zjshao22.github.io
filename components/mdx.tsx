import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import Quiz from "./quiz/Quiz";
import FlowChain from "./flow/FlowChain";
import DataGrid from "./DataGrid";
import DataShowcase from "./DataShowcase";
import KeyPoints from "./KeyPoints";
import AiTimeline from "./AiTimeline";
import RequestJourney from "./network/RequestJourney";
import {
  ArpFigure,
  ByteOrderFigure,
  DatagramFigure,
  EncapsulationFigure,
  HttpExchangeFigure,
  IPv4PrefixFigure,
} from "./network/NetworkFigures";
import {
  LearningLoopFigure,
  GeneralizationCurveFigure,
} from "./ai/MachineLearningFigures";
import {
  NeuralNetworkFigure,
  ConvolutionFigure,
} from "./ai/NeuralNetworkFigures";
import {
  CausalAttentionFigure,
  TokenGenerationFigure,
} from "./ai/LanguageModelFigures";
import {
  AIDataRepresentationFigure,
  AIMethodsFigure,
  LearningParadigmsFigure,
} from "./ai/FoundationsFigures";
import {
  FourTableSchemaFigure,
  SqlOrderFigure,
  NormalizationFlowFigure,
  AcidTransactionFigure,
  AppArchitectureFigure,
  WorkbenchSchemaFigure,
  WorkbenchTableEditorFigure,
  WorkbenchSingleQueryFigure,
  WorkbenchQueryGridFigure,
  TerminalBackupRestoreFigure,
  TerminalSecurityGrantFigure,
  AppGradeSystemFigure,
  GateChainFigure,
  DbsComponentsFigure,
  ThreeSchemaFigure,
  ClientServerArchitectureFigure,
  IntegrityConstraintsFigure,
  JoinPathFigure,
  DbDesignStagesFigure,
  BackupRestoreFlowFigure,
} from "./database/DatabaseFigures";
import InteractiveGradeSystem from "./database/InteractiveGradeSystem";
import {
  CCompilationPipelineFigure,
  CMemoryLayoutFigure,
  PointerIndirectionFigure,
  SwapStackFigure,
  StringArrayMemoryFigure,
  StructAlignmentFigure,
  InputBufferFigure,
  StudyLoopFigure,
  LoopControlFlowFigure,
  WordStateMachineFigure,
  FileFunctionsTreeFigure,
} from "./c/CFigures";

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Quiz,
    FlowChain,
    DataGrid,
    DataShowcase,
    KeyPoints,
    AiTimeline,
    RequestJourney,
    ArpFigure,
    ByteOrderFigure,
    DatagramFigure,
    EncapsulationFigure,
    HttpExchangeFigure,
    IPv4PrefixFigure,
    LearningLoopFigure,
    GeneralizationCurveFigure,
    NeuralNetworkFigure,
    ConvolutionFigure,
    CausalAttentionFigure,
    TokenGenerationFigure,
    AIDataRepresentationFigure,
    AIMethodsFigure,
    LearningParadigmsFigure,
    FourTableSchemaFigure,
    SqlOrderFigure,
    NormalizationFlowFigure,
    AcidTransactionFigure,
    AppArchitectureFigure,
    WorkbenchSchemaFigure,
    WorkbenchTableEditorFigure,
    WorkbenchSingleQueryFigure,
    WorkbenchQueryGridFigure,
    TerminalBackupRestoreFigure,
    TerminalSecurityGrantFigure,
    AppGradeSystemFigure,
    GateChainFigure,
    DbsComponentsFigure,
    ThreeSchemaFigure,
    ClientServerArchitectureFigure,
    IntegrityConstraintsFigure,
    JoinPathFigure,
    DbDesignStagesFigure,
    BackupRestoreFlowFigure,
    InteractiveGradeSystem,
    CCompilationPipelineFigure,
    CMemoryLayoutFigure,
    PointerIndirectionFigure,
    SwapStackFigure,
    StringArrayMemoryFigure,
    StructAlignmentFigure,
    InputBufferFigure,
    StudyLoopFigure,
    LoopControlFlowFigure,
    WordStateMachineFigure,
    FileFunctionsTreeFigure,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}

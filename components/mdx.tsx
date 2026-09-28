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
    LearningLoopFigure,
    GeneralizationCurveFigure,
    NeuralNetworkFigure,
    ConvolutionFigure,
    CausalAttentionFigure,
    TokenGenerationFigure,
    AIDataRepresentationFigure,
    AIMethodsFigure,
    LearningParadigmsFigure,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}


// Fix: Import d3 to resolve 'd3' namespace errors
import * as d3 from 'd3';

export enum EntityType {
  PERSON = 'Person',
  CONCEPT = 'Concept',
  DATA = 'Data',
  METHOD = 'Method',
  ORGANIZATION = 'Organization',
  UNKNOWN = 'Unknown'
}

export interface Node extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: EntityType;
  description: string;
  cluster?: string;
}

export interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  label: string;
  strength: number; // 1-10
}

export interface GraphData {
  nodes: Node[];
  links: Link[];
}

export interface Notebook {
  id: string;
  name: string;
  lastModified: string;
  contentSnippet: string;
}

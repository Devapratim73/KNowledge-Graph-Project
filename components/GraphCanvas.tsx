
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Node, Link, GraphData, EntityType } from '../types';

interface GraphCanvasProps {
  data: GraphData;
  onNodeClick: (node: Node) => void;
  selectedNodeId?: string;
}

const TYPE_COLORS: Record<EntityType, string> = {
  [EntityType.PERSON]: '#ec4899', // Pink
  [EntityType.CONCEPT]: '#3b82f6', // Blue
  [EntityType.DATA]: '#10b981', // Green
  [EntityType.METHOD]: '#f59e0b', // Amber
  [EntityType.ORGANIZATION]: '#8b5cf6', // Violet
  [EntityType.UNKNOWN]: '#64748b' // Slate
};

const GraphCanvas: React.FC<GraphCanvasProps> = ({ data, onNodeClick, selectedNodeId }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Clear previous graph
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g");

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Simulation setup
    const simulation = d3.forceSimulation<Node>(data.nodes)
      .force("link", d3.forceLink<Node, Link>(data.links).id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(60));

    // Markers for arrows
    svg.append("defs").selectAll("marker")
      .data(["end"])
      .enter().append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#475569");

    // Draw links
    const link = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(data.links)
      .enter().append("line")
      .attr("class", "link")
      .attr("stroke", "#475569")
      .attr("stroke-width", d => Math.max(1, d.strength / 2))
      .attr("marker-end", "url(#arrowhead)");

    // Link labels
    const linkLabels = g.append("g")
      .attr("class", "link-labels")
      .selectAll("text")
      .data(data.links)
      .enter().append("text")
      .attr("font-size", "10px")
      .attr("fill", "#94a3b8")
      .attr("text-anchor", "middle")
      .text(d => d.label);

    // Draw nodes
    const node = g.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(data.nodes)
      .enter().append("g")
      .attr("class", "node-group")
      .call(d3.drag<SVGGElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))
      .on("click", (event, d) => onNodeClick(d));

    node.append("circle")
      .attr("r", 15)
      .attr("fill", d => TYPE_COLORS[d.type] || TYPE_COLORS[EntityType.UNKNOWN])
      .attr("stroke", d => d.id === selectedNodeId ? "#fff" : "none")
      .attr("stroke-width", 3)
      .attr("class", "node shadow-lg");

    node.append("text")
      .attr("dx", 20)
      .attr("dy", 4)
      .attr("font-size", "12px")
      .attr("font-weight", "600")
      .attr("fill", "#f8fafc")
      .text(d => d.label);

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as any).x)
        .attr("y1", d => (d.source as any).y)
        .attr("x2", d => (d.target as any).x)
        .attr("y2", d => (d.target as any).y);

      linkLabels
        .attr("x", d => ((d.source as any).x + (d.target as any).x) / 2)
        .attr("y", d => ((d.source as any).y + (d.target as any).y) / 2);

      node
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [data, onNodeClick, selectedNodeId]);

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-900 cursor-grab active:cursor-grabbing overflow-hidden">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
};

export default GraphCanvas;

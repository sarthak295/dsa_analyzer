import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause, RotateCcw, SkipForward, Info, Layers, ListFilter, ArrowRight } from "lucide-react";

interface Node {
  id: string;
  x: number;
  y: number;
}

interface Edge {
  from: string;
  to: string;
  weight: number;
}

const DEFAULT_NODES: Node[] = [
  { id: "A", x: 120, y: 50 },
  { id: "B", x: 60, y: 130 },
  { id: "C", x: 180, y: 130 },
  { id: "D", x: 40, y: 230 },
  { id: "E", x: 120, y: 230 },
  { id: "F", x: 200, y: 230 },
];

const DEFAULT_EDGES: Edge[] = [
  { from: "A", to: "B", weight: 3 },
  { from: "A", to: "C", weight: 5 },
  { from: "B", to: "D", weight: 4 },
  { from: "B", to: "E", weight: 1 },
  { from: "C", to: "F", weight: 2 },
  { from: "E", to: "F", weight: 3 },
];

export default function AlgoVisualizer() {
  const [visualizerType, setVisualizerType] = useState<"graph" | "array">("graph");
  const [algo, setAlgo] = useState<"BFS" | "DFS" | "Dijkstra" | "BinarySearch" | "BubbleSort">("BFS");

  // Graph Data
  const [nodes] = useState<Node[]>(DEFAULT_NODES);
  const [edges] = useState<Edge[]>(DEFAULT_EDGES);

  // Common Traversal / State
  const [visited, setVisited] = useState<string[]>([]);
  const [currentNode, setCurrentNode] = useState<string | null>(null);
  const [dataStructure, setDataStructure] = useState<string[]>([]); // Queue or Stack or Priority Array
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1000); // ms per step
  const [logs, setLogs] = useState<string[]>(["Select an algorithm and click 'Start Visualization'."]);

  // Dijkstra Specific States
  const [distances, setDistances] = useState<Record<string, number>>({});
  const [parents, setParents] = useState<Record<string, string | null>>({});

  // Array Specific States (Sorting & Searching)
  const [arrayData, setArrayData] = useState<number[]>([12, 23, 34, 45, 56, 67, 78, 89, 95]);
  const [searchL, setSearchL] = useState<number>(-1);
  const [searchR, setSearchR] = useState<number>(-1);
  const [searchM, setSearchM] = useState<number>(-1);
  const [searchTarget, setSearchTarget] = useState<number>(67);

  const [sortData, setSortData] = useState<number[]>([45, 12, 89, 23, 67, 34, 95, 56]);
  const [sortIdx, setSortIdx] = useState<number>(-1);
  const [sortPass, setSortPass] = useState<number>(0);
  const [sortSwapped, setSortSwapped] = useState<boolean>(false);
  const [isSorted, setIsSorted] = useState<boolean>(false);

  // Steps / Autoplay Ref tracking
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Dijkstra execution memory refs
  const dijkstraVisitedRef = useRef<Set<string>>(new Set());
  const dijkstraDistancesRef = useRef<Record<string, number>>({});
  const dijkstraParentsRef = useRef<Record<string, string | null>>({});

  // BFS / DFS memory refs
  const queueRef = useRef<string[]>([]);
  const visitedRef = useRef<Set<string>>(new Set());

  // Binary search memory refs
  const binaryLRef = useRef<number>(0);
  const binaryRRef = useRef<number>(8);
  const binaryFinishedRef = useRef<boolean>(false);

  // Bubble sort memory refs
  const bubblePassRef = useRef<number>(0);
  const bubbleIdxRef = useRef<number>(0);
  const bubbleSwappedRef = useRef<boolean>(false);
  const bubbleDataRef = useRef<number[]>([]);

  // Switch visualizer types safely
  const handleTypeChange = (type: "graph" | "array") => {
    setVisualizerType(type);
    if (type === "graph") {
      setAlgo("BFS");
    } else {
      setAlgo("BinarySearch");
    }
  };

  // Reset visualizer
  const reset = () => {
    setIsPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrentNode(null);
    setVisited([]);
    setDataStructure([]);
    queueRef.current = [];
    visitedRef.current = new Set();

    // Reset Dijkstra
    setDistances({});
    setParents({});
    dijkstraVisitedRef.current = new Set();
    dijkstraDistancesRef.current = {};
    dijkstraParentsRef.current = {};

    // Reset Binary Search
    binaryLRef.current = 0;
    binaryRRef.current = arrayData.length - 1;
    setSearchL(0);
    setSearchR(arrayData.length - 1);
    setSearchM(-1);
    binaryFinishedRef.current = false;

    // Reset Bubble Sort
    bubblePassRef.current = 0;
    bubbleIdxRef.current = 0;
    bubbleSwappedRef.current = false;
    const initialUnsorted = [45, 12, 89, 23, 67, 34, 95, 56];
    setSortData(initialUnsorted);
    bubbleDataRef.current = [...initialUnsorted];
    setSortIdx(-1);
    setSortPass(0);
    setSortSwapped(false);
    setIsSorted(false);

    setLogs(["Visualizer reset. Click 'Start' to begin."]);
  };

  useEffect(() => {
    reset();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [algo]);

  // Start the algorithm
  const startTraversal = () => {
    reset();
    const startNode = "A";

    if (algo === "BFS" || algo === "DFS") {
      queueRef.current = [startNode];
      setDataStructure([startNode]);
      setLogs([`Starting ${algo} from root node ${startNode}.`]);
    } else if (algo === "Dijkstra") {
      // Init Dijkstra source
      const initialDists: Record<string, number> = {};
      const initialParents: Record<string, string | null> = {};
      nodes.forEach((n) => {
        initialDists[n.id] = n.id === startNode ? 0 : Infinity;
        initialParents[n.id] = null;
      });
      setDistances(initialDists);
      setParents(initialParents);
      dijkstraDistancesRef.current = initialDists;
      dijkstraParentsRef.current = initialParents;
      dijkstraVisitedRef.current = new Set();

      // Priority queue setup
      setDataStructure([`${startNode}: 0`]);
      setLogs([`Dijkstra's Algorithm: Initialized source node ${startNode} with distance 0, others to Infinity.`]);
    } else if (algo === "BinarySearch") {
      binaryLRef.current = 0;
      binaryRRef.current = arrayData.length - 1;
      setSearchL(0);
      setSearchR(arrayData.length - 1);
      setSearchM(-1);
      binaryFinishedRef.current = false;
      setLogs([`Binary Search: Searching for target ${searchTarget} in sorted array.`]);
    } else if (algo === "BubbleSort") {
      bubblePassRef.current = 0;
      bubbleIdxRef.current = 0;
      bubbleSwappedRef.current = false;
      bubbleDataRef.current = [...sortData];
      setSortIdx(0);
      setSortPass(0);
      setSortSwapped(false);
      setIsSorted(false);
      setLogs([`Bubble Sort: Starting comparison-based sorting sweep.`]);
    }

    setIsPlaying(true);
  };

  // Perform single step
  const step = () => {
    if (algo === "BFS" || algo === "DFS") {
      if (queueRef.current.length === 0) {
        setIsPlaying(false);
        setCurrentNode(null);
        setLogs((prev) => [...prev, `${algo} Traversal complete! All reachable vertices visited.`]);
        return;
      }

      let nextNode: string;
      if (algo === "BFS") {
        nextNode = queueRef.current.shift()!;
      } else {
        nextNode = queueRef.current.pop()!;
      }

      setCurrentNode(nextNode);
      setDataStructure([...queueRef.current]);

      if (!visitedRef.current.has(nextNode)) {
        visitedRef.current.add(nextNode);
        setVisited(Array.from(visitedRef.current));

        const neighbors = edges
          .filter((e) => e.from === nextNode || e.to === nextNode)
          .map((e) => (e.from === nextNode ? e.to : e.from))
          .filter((node) => !visitedRef.current.has(node));

        const uniquelyNew = neighbors.filter((n) => !queueRef.current.includes(n));
        queueRef.current = [...queueRef.current, ...uniquelyNew];

        setDataStructure([...queueRef.current]);
        setLogs((prev) => [
          ...prev,
          `Visited Node ${nextNode}. Adjacent unvisited nodes added: [${uniquelyNew.join(", ")}]. Current ${algo === "BFS" ? "Queue" : "Stack"}: [${queueRef.current.join(", ")}].`,
        ]);
      } else {
        setLogs((prev) => [...prev, `Node ${nextNode} already visited, skipping.`]);
      }
    } else if (algo === "Dijkstra") {
      // Find unvisited node with minimum distance
      let minNode: string | null = null;
      let minDist = Infinity;

      nodes.forEach((n) => {
        if (!dijkstraVisitedRef.current.has(n.id)) {
          const dist = dijkstraDistancesRef.current[n.id] ?? Infinity;
          if (dist < minDist) {
            minDist = dist;
            minNode = n.id;
          }
        }
      });

      if (minNode === null || minDist === Infinity) {
        setIsPlaying(false);
        setCurrentNode(null);
        setLogs((prev) => [
          ...prev,
          "Dijkstra's Shortest Path complete! No more unvisited reachable vertices.",
        ]);
        return;
      }

      const active: string = minNode;
      setCurrentNode(active);
      dijkstraVisitedRef.current.add(active);
      setVisited(Array.from(dijkstraVisitedRef.current));

      // Relax edges of current node
      const adjacentEdges = edges.filter((e) => e.from === active || e.to === active);
      const updatedLogs: string[] = [];

      adjacentEdges.forEach((edge) => {
        const neighbor = edge.from === active ? edge.to : edge.from;
        if (!dijkstraVisitedRef.current.has(neighbor)) {
          const altDist = minDist + edge.weight;
          const currentNeighborDist = dijkstraDistancesRef.current[neighbor] ?? Infinity;

          if (altDist < currentNeighborDist) {
            dijkstraDistancesRef.current[neighbor] = altDist;
            dijkstraParentsRef.current[neighbor] = active;
            updatedLogs.push(
              `Relaxed path to ${neighbor} through ${active}: Distance updated to ${altDist} (previous: ${currentNeighborDist === Infinity ? "Infinity" : currentNeighborDist}).`
            );
          }
        }
      });

      setDistances({ ...dijkstraDistancesRef.current });
      setParents({ ...dijkstraParentsRef.current });

      // Update Priority Queue visual representation
      const pqDisplay = nodes
        .filter((n) => !dijkstraVisitedRef.current.has(n.id))
        .map((n) => `${n.id}: ${dijkstraDistancesRef.current[n.id] === Infinity ? "∞" : dijkstraDistancesRef.current[n.id]}`)
        .sort((a, b) => {
          const valA = a.split(": ")[1] === "∞" ? Infinity : Number(a.split(": ")[1]);
          const valB = b.split(": ")[1] === "∞" ? Infinity : Number(b.split(": ")[1]);
          return valA - valB;
        });

      setDataStructure(pqDisplay);

      setLogs((prev) => [
        ...prev,
        `Selected Node ${active} with minimum tentative distance ${minDist}.`,
        ...(updatedLogs.length > 0 ? updatedLogs : ["No paths could be shortened from this node."]),
      ]);
    } else if (algo === "BinarySearch") {
      if (binaryFinishedRef.current) {
        setIsPlaying(false);
        return;
      }

      const l = binaryLRef.current;
      const r = binaryRRef.current;

      if (l > r) {
        setIsPlaying(false);
        setSearchM(-1);
        binaryFinishedRef.current = true;
        setLogs((prev) => [...prev, `Target ${searchTarget} was not found in the array. Search space exhausted.`]);
        return;
      }

      const mid = Math.floor((l + r) / 2);
      setSearchM(mid);
      const val = arrayData[mid];

      if (val === searchTarget) {
        setIsPlaying(false);
        binaryFinishedRef.current = true;
        setLogs((prev) => [
          ...prev,
          `Found target ${searchTarget} at index ${mid}! (array[${mid}] === ${val}).`,
        ]);
      } else if (val < searchTarget) {
        setLogs((prev) => [
          ...prev,
          `Checked index ${mid} (value ${val} < ${searchTarget}). Shifting low pointer to mid + 1 (${mid + 1}).`,
        ]);
        binaryLRef.current = mid + 1;
        setSearchL(mid + 1);
      } else {
        setLogs((prev) => [
          ...prev,
          `Checked index ${mid} (value ${val} > ${searchTarget}). Shifting high pointer to mid - 1 (${mid - 1}).`,
        ]);
        binaryRRef.current = mid - 1;
        setSearchR(mid - 1);
      }
    } else if (algo === "BubbleSort") {
      if (isSorted) {
        setIsPlaying(false);
        return;
      }

      const data = [...bubbleDataRef.current];
      const n = data.length;
      const i = bubblePassRef.current;
      const j = bubbleIdxRef.current;

      if (i >= n - 1) {
        setIsSorted(true);
        setIsPlaying(false);
        setSortIdx(-1);
        setLogs((prev) => [...prev, "Bubble Sort Completed! Entire array successfully sorted."]);
        return;
      }

      setLogs((prev) => [
        ...prev,
        `Comparing array[${j}] (${data[j]}) and array[${j + 1}] (${data[j + 1]}).`,
      ]);

      let swapped = bubbleSwappedRef.current;

      if (data[j] > data[j + 1]) {
        // Swap values
        const temp = data[j];
        data[j] = data[j + 1];
        data[j + 1] = temp;
        swapped = true;
        bubbleSwappedRef.current = true;
        setSortSwapped(true);
        setLogs((prev) => [
          ...prev,
          `Swapped array[${j}] and array[${j + 1}] because ${temp} > ${data[j]}.`,
        ]);
      } else {
        setSortSwapped(false);
      }

      // Progress pointer
      let nextJ = j + 1;
      let nextI = i;

      if (nextJ >= n - 1 - i) {
        // Finished pass
        if (!swapped) {
          // If no elements were swapped during this entire pass, array is fully sorted!
          setIsSorted(true);
          setIsPlaying(false);
          setSortIdx(-1);
          setLogs((prev) => [...prev, "No elements were swapped during this pass. Array is optimized and fully sorted!"]);
          return;
        }
        nextJ = 0;
        nextI = i + 1;
        bubbleSwappedRef.current = false;
        setSortSwapped(false);
        setSortPass(nextI);
        setLogs((prev) => [...prev, `--- Completed Pass ${i + 1} ---`]);
      }

      bubbleIdxRef.current = nextJ;
      bubblePassRef.current = nextI;
      bubbleDataRef.current = data;
      setSortData(data);
      setSortIdx(nextJ);
    }
  };

  // Autoplay Control Loop
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        step();
      }, speed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speed, algo, arrayData, sortData]);

  // Handle manual target search update
  const handleTargetChange = (val: number) => {
    setSearchTarget(val);
    reset();
  };

  return (
    <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 shadow-sm">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Algorithm Visualizer</h2>
          <p className="text-xs text-slate-400">
            Interactive playground to step through and learn fundamental graph traversals, shortest path, sorting, and binary searching.
          </p>
        </div>

        {/* Primary Type Select Category */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0">
            <button
              onClick={() => handleTypeChange("graph")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                visualizerType === "graph" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Graph</span>
            </button>
            <button
              onClick={() => handleTypeChange("array")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                visualizerType === "array" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Array</span>
            </button>
          </div>

          {/* Secondary Sub Algo selection */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-lg border border-slate-800/60 shrink-0">
            {visualizerType === "graph" ? (
              <>
                <button
                  onClick={() => setAlgo("BFS")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    algo === "BFS" ? "bg-slate-800 text-indigo-400" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  BFS
                </button>
                <button
                  onClick={() => setAlgo("DFS")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    algo === "DFS" ? "bg-slate-800 text-indigo-400" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  DFS
                </button>
                <button
                  onClick={() => setAlgo("Dijkstra")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    algo === "Dijkstra" ? "bg-slate-800 text-indigo-400" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  Dijkstra
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setAlgo("BinarySearch")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    algo === "BinarySearch" ? "bg-slate-800 text-indigo-400" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  Binary Search
                </button>
                <button
                  onClick={() => setAlgo("BubbleSort")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    algo === "BubbleSort" ? "bg-slate-800 text-indigo-400" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  Bubble Sort
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Visual Canvas Stage Area */}
        <div className="lg:col-span-2 bg-slate-950 rounded-xl p-4 border border-slate-800/80 flex flex-col items-center justify-center relative min-h-[380px]">
          
          {visualizerType === "graph" ? (
            /* Graph visualization SVG */
            <svg className="w-full max-w-[420px] h-[320px]" viewBox="0 0 250 300">
              {/* Draw Edges */}
              {edges.map((edge, idx) => {
                const fromNode = nodes.find((n) => n.id === edge.from)!;
                const toNode = nodes.find((n) => n.id === edge.to)!;
                const isTraversed =
                  visited.includes(edge.from) && visited.includes(edge.to);
                
                // Calculate line midpoint to draw weight numbers
                const midX = (fromNode.x + toNode.x) / 2;
                const midY = (fromNode.y + toNode.y) / 2;

                return (
                  <g key={idx}>
                    <line
                      x1={fromNode.x}
                      y1={fromNode.y}
                      x2={toNode.x}
                      y2={toNode.y}
                      stroke={isTraversed ? "#6366f1" : "#1e293b"}
                      strokeWidth={isTraversed ? 3 : 1.5}
                      className="transition-all duration-500"
                    />
                    {/* Weight badge background & text for Dijkstra */}
                    <rect
                      x={midX - 7}
                      y={midY - 7}
                      width={14}
                      height={14}
                      rx={3}
                      fill="#020617"
                      stroke={isTraversed ? "#4f46e5" : "#334155"}
                      strokeWidth={1}
                    />
                    <text
                      x={midX}
                      y={midY + 3.5}
                      textAnchor="middle"
                      className="font-mono text-[8px] font-bold fill-indigo-300 select-none"
                    >
                      {edge.weight}
                    </text>
                  </g>
                );
              })}

              {/* Draw Nodes */}
              {nodes.map((node) => {
                const isCurrent = currentNode === node.id;
                const isVisited = visited.includes(node.id);
                const nodeDist = distances[node.id];

                return (
                  <g key={node.id} className="cursor-pointer">
                    <motion.circle
                      cx={node.x}
                      cy={node.y}
                      r={18}
                      fill={isCurrent ? "#ef4444" : isVisited ? "#6366f1" : "#0f172a"}
                      stroke={isCurrent ? "#fca5a5" : isVisited ? "#818cf8" : "#334155"}
                      strokeWidth={isCurrent ? 4 : 2}
                      initial={{ scale: 0.8 }}
                      animate={{ scale: isCurrent ? 1.2 : 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    />
                    <text
                      x={node.x}
                      y={node.y + 4}
                      textAnchor="middle"
                      className={`font-sans font-bold text-xs select-none ${
                        isCurrent || isVisited ? "fill-white" : "fill-slate-400"
                      }`}
                    >
                      {node.id}
                    </text>

                    {/* Dijkstra specific node status labels (Tentative Distance) */}
                    {algo === "Dijkstra" && nodeDist !== undefined && (
                      <g transform={`translate(${node.x}, ${node.y - 25})`}>
                        <rect
                          x={-20}
                          y={-7}
                          width={40}
                          height={12}
                          rx={4}
                          fill="#1e1b4b"
                          stroke="#312e81"
                          strokeWidth={1}
                        />
                        <text
                          x={0}
                          y={2}
                          textAnchor="middle"
                          className="font-mono text-[8px] font-bold fill-indigo-300"
                        >
                          dist: {nodeDist === Infinity ? "∞" : nodeDist}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          ) : algo === "BinarySearch" ? (
            /* Binary Search visualization elements */
            <div className="w-full max-w-lg space-y-8 py-6 px-2">
              <div className="flex justify-between items-center bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-400 font-bold">Target Element:</span>
                <div className="flex items-center gap-1.5">
                  {[12, 34, 56, 67, 78, 95].map((t) => (
                    <button
                      key={t}
                      onClick={() => handleTargetChange(t)}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                        searchTarget === t
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-950 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap justify-center items-end gap-2.5 min-h-[120px] pt-4">
                {arrayData.map((val, idx) => {
                  const isLow = idx === searchL;
                  const isHigh = idx === searchR;
                  const isMid = idx === searchM;
                  const inRange = idx >= searchL && idx <= searchR;
                  const isFound = val === searchTarget && isMid && binaryFinishedRef.current;

                  return (
                    <div key={idx} className="flex flex-col items-center">
                      <motion.div
                        animate={{
                          scale: isMid ? 1.15 : 1,
                          backgroundColor: isFound
                            ? "#10b981"
                            : isMid
                            ? "#ef4444"
                            : inRange
                            ? "#1e1b4b"
                            : "#0f172a",
                          borderColor: isFound
                            ? "#34d399"
                            : isMid
                            ? "#fca5a5"
                            : inRange
                            ? "#4f46e5"
                            : "#1e293b",
                        }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        className="w-11 h-11 rounded-lg border-2 flex items-center justify-center text-sm font-mono font-bold text-white shadow-sm"
                      >
                        {val}
                      </motion.div>
                      <span className="text-[10px] text-slate-500 font-mono mt-1">idx {idx}</span>
                      
                      {/* Pointer Indicator Badges */}
                      <div className="h-10 flex flex-col justify-start items-center gap-1 mt-1 text-[9px] font-bold">
                        {isMid && <span className="bg-red-500/10 text-red-400 px-1 rounded border border-red-500/20">MID</span>}
                        {isLow && <span className="bg-indigo-500/10 text-indigo-400 px-1 rounded border border-indigo-500/20">LOW</span>}
                        {isHigh && <span className="bg-amber-500/10 text-amber-400 px-1 rounded border border-amber-500/20">HIGH</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Bubble Sort vertical bar chart visualization */
            <div className="w-full max-w-md space-y-6 py-6 px-2">
              <div className="flex justify-between items-center text-xs bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <div className="flex gap-4">
                  <div>
                    <span className="text-slate-400 block font-bold">Pass Sweep:</span>
                    <span className="font-mono text-white text-sm font-semibold">{sortPass}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold">Swap Status:</span>
                    <span className={`font-semibold ${sortSwapped ? "text-emerald-400" : "text-slate-500"}`}>
                      {sortSwapped ? "Swapped" : "Unswapped"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={reset}
                  className="bg-slate-950 hover:bg-slate-800 text-[11px] font-bold text-slate-400 px-2 py-1 rounded border border-slate-800 transition-all cursor-pointer"
                >
                  Shuffle Array
                </button>
              </div>

              <div className="h-[140px] flex items-end justify-between gap-3 border-b border-slate-800 pb-2">
                {sortData.map((val, idx) => {
                  const isComparing = idx === sortIdx || idx === sortIdx + 1;
                  const isSortedNode = isSorted || (idx >= sortData.length - sortPass);

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center">
                      <motion.div
                        style={{ height: `${val * 1.1}px` }}
                        animate={{
                          backgroundColor: isSortedNode
                            ? "#10b981"
                            : isComparing
                            ? "#ef4444"
                            : "#312e81",
                        }}
                        className="w-full rounded-t-md relative flex items-start justify-center pt-2 shadow-inner"
                      >
                        <span className="text-[10px] font-mono font-bold text-white">{val}</span>
                      </motion.div>
                      <span className="text-[9px] text-slate-500 font-mono mt-1">i:{idx}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Interactive Legends */}
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-3 text-[10px] font-semibold text-slate-400">
            {visualizerType === "graph" ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                  <span>Active Node</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
                  <span>Visited / Extracted</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700 inline-block"></span>
                  <span>Unexplored</span>
                </div>
              </>
            ) : algo === "BinarySearch" ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-lg bg-red-500 inline-block"></span>
                  <span>Mid Index</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-lg bg-indigo-950 border border-indigo-500 inline-block"></span>
                  <span>Active Search Bound</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-lg bg-emerald-500 inline-block"></span>
                  <span>Target Found</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-red-500 inline-block"></span>
                  <span>Comparing Elements</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block"></span>
                  <span>Locked In Order</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Data Structure Panel & Logs */}
        <div className="flex flex-col gap-4">
          
          {/* Active Data Structure Display */}
          <div className="bg-slate-950 text-slate-100 border border-slate-800 rounded-xl p-4 font-mono text-xs flex flex-col h-[160px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                {algo === "BFS"
                  ? "QUEUE (FIFO)"
                  : algo === "DFS"
                  ? "STACK (LIFO)"
                  : algo === "Dijkstra"
                  ? "PRIORITY QUEUE (TENTATIVE)"
                  : algo === "BinarySearch"
                  ? "SEARCH RANGE BOUNDS"
                  : "BUBBLE SORT TARGET"}
              </span>
              <span className="text-[9px] text-indigo-400 font-bold uppercase">
                {algo === "BFS"
                  ? "Shift Front"
                  : algo === "DFS"
                  ? "Pop End"
                  : algo === "Dijkstra"
                  ? "Min-Extract First"
                  : algo === "BinarySearch"
                  ? "Dividing Search"
                  : "Array Pass Swaps"}
              </span>
            </div>
            
            <div className="flex-1 flex items-center justify-center gap-2 overflow-x-auto py-2">
              {algo === "BinarySearch" ? (
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="text-center">
                    <span className="text-[10px] text-slate-500 block">LOW INDEX</span>
                    <span className="bg-indigo-600/20 text-indigo-300 font-bold px-3 py-1 rounded border border-indigo-500/20">
                      {searchL} (val: {arrayData[searchL] ?? "—"})
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600" />
                  <div className="text-center">
                    <span className="text-[10px] text-slate-500 block">MID INDEX</span>
                    <span className="bg-red-500/20 text-red-300 font-bold px-3 py-1 rounded border border-red-500/20">
                      {searchM !== -1 ? `${searchM} (val: ${arrayData[searchM]})` : "—"}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600" />
                  <div className="text-center">
                    <span className="text-[10px] text-slate-500 block">HIGH INDEX</span>
                    <span className="bg-amber-600/20 text-amber-300 font-bold px-3 py-1 rounded border border-amber-500/20">
                      {searchR} (val: {arrayData[searchR] ?? "—"})
                    </span>
                  </div>
                </div>
              ) : algo === "BubbleSort" ? (
                <div className="text-center space-y-1">
                  <span className="text-[10px] text-slate-500 block">ACTIVE SCANNING INDEX</span>
                  <div className="font-bold text-sm text-indigo-400">
                    index {sortIdx} ⇄ index {sortIdx + 1}
                  </div>
                  <span className="text-[9px] text-slate-400 block max-w-xs leading-relaxed">
                    Iteratively swapping adjacent pairs if the left element is larger than the right.
                  </span>
                </div>
              ) : (
                <AnimatePresence>
                  {dataStructure.length === 0 ? (
                    <span className="text-slate-600 text-[11px]">No values in buffer</span>
                  ) : (
                    <div className="flex items-center gap-1.5 overflow-x-auto w-full justify-start px-2">
                      {dataStructure.map((val, idx) => {
                        const isPrimaryTarget =
                          (idx === 0 && algo === "BFS") ||
                          (idx === dataStructure.length - 1 && algo === "DFS") ||
                          (idx === 0 && algo === "Dijkstra");

                        return (
                          <motion.div
                            key={`${val}-${idx}`}
                            initial={{ scale: 0.5, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.5, opacity: 0, y: -10 }}
                            className={`px-2.5 h-8 rounded flex items-center justify-center font-bold text-xs shrink-0 border ${
                              isPrimaryTarget
                                ? "bg-red-500/20 text-red-300 border-red-500/30"
                                : "bg-indigo-600/10 text-indigo-300 border-indigo-500/20"
                            }`}
                          >
                            {val}
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Trace Logs */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex-1 flex flex-col h-[200px]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              <span>Execution Trace Logs</span>
            </span>
            <div className="flex-1 overflow-y-auto font-mono text-[10px] text-slate-400 space-y-1.5 pr-1">
              {logs.map((log, idx) => (
                <div key={idx} className="border-l-2 border-indigo-500/30 pl-2 leading-relaxed">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Control Buttons Footer panel */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-6 border-t border-slate-800 pt-4">
        <div className="flex items-center gap-2">
          {!isPlaying && currentNode === null && visited.length === 0 ? (
            <button
              onClick={startTraversal}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-indigo-950/20"
            >
              <Play className="w-3.5 h-3.5 animate-pulse" />
              <span>Start Visualizing</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? "Pause" : "Resume"}</span>
              </button>
              <button
                onClick={step}
                disabled={isPlaying}
                className="bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-200 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>Step Forward</span>
              </button>
            </>
          )}

          <button
            onClick={reset}
            className="bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-200 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Visualizer</span>
          </button>
        </div>

        {/* Speed Slider control */}
        <div className="flex items-center gap-3 bg-slate-950/60 px-3.5 py-1.5 rounded-lg border border-slate-800/80">
          <span className="text-xs text-slate-400 font-medium select-none">Speed Delay:</span>
          <input
            type="range"
            min="200"
            max="2000"
            step="100"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-24 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <span className="text-xs font-mono text-indigo-400 w-12 text-right font-bold">{speed}ms</span>
        </div>
      </div>
    </div>
  );
}

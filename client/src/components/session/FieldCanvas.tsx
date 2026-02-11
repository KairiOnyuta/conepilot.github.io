import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Stage, Layer, Rect, Line, Text, Image as KonvaImage, Group } from 'react-konva';
import useImage from 'use-image';
import { useSessionStore } from '../../store/useSessionStore';
import { ConeNode } from './ConeNode';
import { RobotNode } from './RobotNode';
import { Grid3x3, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface FieldCanvasProps {
    width: number;
    height: number;
}

const SCALE = 40; // 40px/m
const ZOOM_STEP = 0.5;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const SNAP_OPTIONS = [0, 0.25, 0.5, 1];

const snapVal = (v: number, size: number) => size > 0 ? Math.round(v / size) * size : v;

// Inner component to handle image loading hook
const ConeImage = ({ x, y, opacity = 1, rotation = 0, size = 30 }: { x: number, y: number, opacity?: number, rotation?: number, size?: number }) => {
    const [image] = useImage('/cone.png');
    const half = size / 2;
    return <KonvaImage
        image={image}
        x={x}
        y={y}
        width={size}
        height={size}
        offsetX={half}
        offsetY={half}
        opacity={opacity}
        rotation={rotation}
    />;
};

export const FieldCanvas: React.FC<FieldCanvasProps> = ({ width: _width, height: _height }) => {
    const { currentSession, addCone, updateConePosition, removeCone, optimizedPath, isSimulating } = useSessionStore();
    const stageRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);
    const [containerWidth, setContainerWidth] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
    const [snapIndex, setSnapIndex] = useState(2); // default to 0.5m

    const snapSize = SNAP_OPTIONS[snapIndex];

    // Measure container WIDTH only (height is determined by content)
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const observer = new ResizeObserver(entries => {
            const { width } = entries[0].contentRect;
            setContainerWidth(width);
        });
        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    // Reset pan position when zooming back to fit
    useEffect(() => {
        if (zoom === MIN_ZOOM) {
            setStagePos({ x: 0, y: 0 });
        }
    }, [zoom]);

    if (!currentSession) return null;

    const fW = currentSession.fieldWidth;
    const fH = currentSession.fieldHeight;
    const fieldWidthPx = fW * SCALE;
    const fieldHeightPx = fH * SCALE;

    // Padding for labels only (Y-axis left, X-axis bottom)
    const LABEL_PAD_LEFT = 30;
    const LABEL_PAD_BOTTOM = 22;
    const LABEL_PAD_TOP = 8;
    const LABEL_PAD_RIGHT = 8;

    const totalWidth = fieldWidthPx + LABEL_PAD_LEFT + LABEL_PAD_RIGHT;
    const totalHeight = fieldHeightPx + LABEL_PAD_TOP + LABEL_PAD_BOTTOM;

    // Fit to container width
    const fitScale = containerWidth > 0 ? containerWidth / totalWidth : 1;

    // Scale-aware stroke
    const strokeScale = 1 / fitScale;

    // Cone size
    const coneSize = Math.max(8, Math.min(30 / fitScale, 0.3 * SCALE));

    const actualScale = zoom * fitScale;
    const scaledWidth = totalWidth * actualScale;
    const scaledHeight = totalHeight * actualScale;

    // Stage dimensions
    const stageWidth = containerWidth || totalWidth;
    const stageHeight = Math.ceil(totalHeight * fitScale * zoom);

    // Center content when zoomed out
    const centerX = Math.max(0, (stageWidth - scaledWidth) / 2);
    const centerY = Math.max(0, (stageHeight - scaledHeight) / 2);

    const canDrag = scaledWidth > stageWidth || scaledHeight > stageHeight;

    // Clamp stage position
    const clampStagePos = (pos: { x: number, y: number }) => {
        let x: number, y: number;
        if (scaledWidth <= stageWidth) {
            x = centerX;
        } else {
            const minX = stageWidth - scaledWidth;
            x = Math.max(minX, Math.min(0, pos.x));
        }
        if (scaledHeight <= stageHeight) {
            y = centerY;
        } else {
            const minY = stageHeight - scaledHeight;
            y = Math.max(minY, Math.min(0, pos.y));
        }
        return { x, y };
    };

    const effectivePos = canDrag ? clampStagePos(stagePos) : { x: centerX, y: centerY };

    // Zoom handlers
    const handleZoomIn = () => setZoom(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
    const handleFitView = () => {
        setZoom(MIN_ZOOM);
        setStagePos({ x: 0, y: 0 });
    };

    // Snap toggle
    const handleCycleSnap = () => setSnapIndex(prev => (prev + 1) % SNAP_OPTIONS.length);

    // Y-flip helper
    const fieldToCanvasY = (fy: number) => (fH - fy) * SCALE;

    // Convert screen pointer to field coordinates
    const pointerToFieldCoords = (stage: any): { raw: { x: number; y: number }; snapped: { x: number; y: number } } | null => {
        const pointer = stage.getPointerPosition();
        if (!pointer) return null;

        const sx = stage.x();
        const sy = stage.y();
        const canvasX = ((pointer.x - sx) / actualScale - LABEL_PAD_LEFT) / SCALE;
        const canvasY = ((pointer.y - sy) / actualScale - LABEL_PAD_TOP) / SCALE;

        const rawX = canvasX;
        const rawY = fH - canvasY;

        if (rawX >= 0 && rawX <= fW && rawY >= 0 && rawY <= fH) {
            return {
                raw: { x: rawX, y: rawY },
                snapped: { x: snapVal(rawX, snapSize), y: snapVal(rawY, snapSize) },
            };
        }
        return null;
    };

    const handleMouseMove = (e: any) => {
        const stage = e.target.getStage();
        if (!stage) return;
        const coords = pointerToFieldCoords(stage);
        setMousePos(coords ? coords.snapped : null);
    };

    const handleStageClick = (e: any) => {
        if (e.target.attrs.draggable || e.target.parent?.attrs.draggable) return;
        if (isSimulating) return;

        const stage = e.target.getStage();
        if (!stage) return;

        const coords = pointerToFieldCoords(stage);
        if (coords) {
            addCone(currentSession.id, coords.snapped.x, coords.snapped.y);
        }
    };

    // Grid
    const majorStep = Math.max(fW, fH) <= 10 ? 1 : 5;
    const showSubGrid = Math.max(fW, fH) <= 5;
    const labelFontSize = Math.max(8, Math.round(12 * Math.min(1, strokeScale)));

    const gridLines = [];
    const labels = [];

    if (showSubGrid) {
        for (let i = 0.5; i < fW; i += 1) {
            gridLines.push(
                <Line key={`sv${i}`} points={[i * SCALE, 0, i * SCALE, fieldHeightPx]} stroke="#F0F0F0" strokeWidth={Math.max(0.5, 0.5 * strokeScale)} />
            );
        }
        for (let i = 0.5; i < fH; i += 1) {
            gridLines.push(
                <Line key={`sh${i}`} points={[0, i * SCALE, fieldWidthPx, i * SCALE]} stroke="#F0F0F0" strokeWidth={Math.max(0.5, 0.5 * strokeScale)} />
            );
        }
    }

    for (let i = 0; i <= fW; i += 1) {
        const isMajor = i % majorStep === 0;
        gridLines.push(
            <Line key={`v${i}`} points={[i * SCALE, 0, i * SCALE, fieldHeightPx]} stroke={isMajor ? "#D4D4D8" : "#E5E5E5"} strokeWidth={Math.max(0.5, (isMajor ? 0.75 : 0.5) * strokeScale)} dash={isMajor ? [] : [4, 4]} />
        );
        if (isMajor) labels.push(<Text key={`lx${i}`} x={i * SCALE - 10} y={fieldHeightPx + 6} text={`${i}m`} fontSize={labelFontSize} fill="#6B6B6B" />);
    }
    for (let i = 0; i <= fH; i += 1) {
        const isMajor = i % majorStep === 0;
        gridLines.push(
            <Line key={`h${i}`} points={[0, i * SCALE, fieldWidthPx, i * SCALE]} stroke={isMajor ? "#D4D4D8" : "#E5E5E5"} strokeWidth={Math.max(0.5, (isMajor ? 0.75 : 0.5) * strokeScale)} dash={isMajor ? [] : [4, 4]} />
        );
        if (isMajor) labels.push(<Text key={`ly${i}`} x={-LABEL_PAD_LEFT + 2} y={i * SCALE - 6} text={`${fH - i}m`} fontSize={labelFontSize} fill="#6B6B6B" />);
    }

    // Path
    const pathPoints = optimizedPath.flatMap(p => [p.x * SCALE, fieldToCanvasY(p.y)]);

    const robotPath = useMemo(
        () => isSimulating ? optimizedPath.map(p => ({ x: p.x, y: fH - p.y })) : [],
        [isSimulating, optimizedPath, fH]
    );

    const snapLabel = snapSize > 0 ? `${snapSize}m` : 'OFF';

    return (
        <div ref={containerRef} className="w-full">
            {/* Coordinate readout - above the canvas */}
            <div className="flex items-center justify-end mb-1.5 px-1">
                <div className="bg-gray-100 rounded px-2 py-1 text-xs font-medium text-gray-600 select-none">
                    {mousePos
                        ? <span><span className="text-gray-400">X:</span> {mousePos.x.toFixed(2)}m <span className="text-gray-400 ml-1.5">Y:</span> {mousePos.y.toFixed(2)}m</span>
                        : <span className="text-gray-400">Tap grid to place cones</span>
                    }
                </div>
            </div>

            {/* Canvas - tightly sized to grid content */}
            <div
                className="bg-white rounded-xl shadow-sm border border-border overflow-hidden"
                style={{ touchAction: 'none' }}
            >
                <Stage
                    width={stageWidth}
                    height={stageHeight}
                    scaleX={actualScale}
                    scaleY={actualScale}
                    x={effectivePos.x}
                    y={effectivePos.y}
                    draggable={canDrag}
                    dragBoundFunc={(pos) => clampStagePos(pos)}
                    onDragEnd={(e) => {
                        setStagePos({ x: e.target.x(), y: e.target.y() });
                    }}
                    onClick={handleStageClick}
                    onTap={handleStageClick}
                    onMouseMove={handleMouseMove}
                    onTouchMove={handleMouseMove}
                    onMouseLeave={() => setMousePos(null)}
                    ref={stageRef}
                >
                    <Layer x={LABEL_PAD_LEFT} y={LABEL_PAD_TOP}>
                        <Rect width={fieldWidthPx} height={fieldHeightPx} fill="#F4F4F5" stroke="#D4D4D8" strokeWidth={Math.max(0.5, 1 * strokeScale)} />
                        {gridLines}
                        {labels}

                        {/* Path Lines */}
                        {pathPoints.length > 0 && (
                            <Line
                                points={pathPoints}
                                stroke="#000000"
                                strokeWidth={Math.max(1, 2 * strokeScale)}
                                dash={[10, 5]}
                                lineCap="round"
                                lineJoin="round"
                                opacity={0.8}
                            />
                        )}

                        {/* Active Cones */}
                        {currentSession.cones.map((cone) => (
                            <ConeNode
                                key={cone.id}
                                cone={cone}
                                scale={SCALE}
                                fieldWidth={fW}
                                fieldHeight={fH}
                                snapSize={snapSize}
                                coneSize={coneSize}
                                onDragEnd={(id, x, y) => updateConePosition(currentSession.id, id, x, y)}
                                onDelete={(id) => removeCone(currentSession.id, id)}
                                imageMode={true}
                                opacity={0.8}
                            />
                        ))}

                        {/* Robot Layer */}
                        <RobotNode
                            x={0}
                            y={fH}
                            scale={SCALE}
                            path={robotPath}
                        />

                        {/* Ghost Cone Cursor */}
                        {mousePos && !isSimulating && (
                            <Group x={mousePos.x * SCALE} y={fieldToCanvasY(mousePos.y)} opacity={0.6} listening={false}>
                                <ConeImage x={0} y={0} size={coneSize} />
                            </Group>
                        )}
                    </Layer>
                </Stage>
            </div>

            {/* Controls bar - below the canvas, never obstructing */}
            <div className="flex items-center justify-center gap-2 mt-2 px-1">
                {/* Snap toggle */}
                <button
                    onClick={handleCycleSnap}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium select-none transition-colors ${
                        snapSize > 0
                            ? 'bg-primary/10 border-primary/30 text-primary'
                            : 'bg-white border-gray-300 text-gray-500'
                    }`}
                >
                    <Grid3x3 size={14} />
                    <span>SNAP</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        snapSize > 0 ? 'bg-primary/20 text-primary' : 'bg-gray-100 text-gray-400'
                    }`}>
                        {snapLabel}
                    </span>
                </button>

                <div className="h-7 w-px bg-gray-200"></div>

                {/* Zoom controls */}
                <button
                    onClick={handleZoomOut}
                    disabled={zoom <= MIN_ZOOM}
                    className="w-9 h-9 bg-white border border-gray-300 rounded-lg flex items-center justify-center text-gray-700 active:bg-gray-100 disabled:opacity-30 transition-colors select-none"
                >
                    <ZoomOut size={16} />
                </button>
                <button
                    onClick={handleFitView}
                    className="w-9 h-9 bg-white border border-gray-300 rounded-lg flex items-center justify-center text-gray-700 active:bg-gray-100 transition-colors select-none"
                    title="Fit to view"
                >
                    <Maximize size={14} />
                </button>
                <button
                    onClick={handleZoomIn}
                    disabled={zoom >= MAX_ZOOM}
                    className="w-9 h-9 bg-white border border-gray-300 rounded-lg flex items-center justify-center text-gray-700 active:bg-gray-100 disabled:opacity-30 transition-colors select-none"
                >
                    <ZoomIn size={16} />
                </button>

                <div className="h-7 w-px bg-gray-200"></div>

                {/* Zoom level */}
                <span className="text-xs text-gray-400 font-medium select-none">{Math.round(actualScale * 100)}%</span>
            </div>
        </div>
    );
};

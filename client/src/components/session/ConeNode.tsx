import React from 'react';
import { Circle, Text, Group, Image as KonvaImage, Rect } from 'react-konva';
import useImage from 'use-image';
import type { ConeData } from '../../store/useSessionStore';

interface ConeNodeProps {
    cone: ConeData;
    scale: number; // pixels per meter
    fieldWidth: number; // field width in meters (for clamping)
    fieldHeight: number; // field height in meters (for Y-flip)
    onDragEnd: (id: string, x: number, y: number) => void;
    onDelete: (id: string) => void;
    imageMode?: boolean;
    opacity?: number;
    snapSize?: number; // meters (0 = no snap)
    coneSize?: number; // pixel diameter of the cone visual (in canvas coords)
}

export const ConeNode: React.FC<ConeNodeProps> = ({ cone, scale, fieldWidth, fieldHeight, onDragEnd, onDelete, imageMode, opacity = 1, snapSize = 0, coneSize = 34 }) => {
    const pixelX = cone.x * scale;
    const pixelY = (fieldHeight - cone.y) * scale;
    const [image] = useImage('/cone.png');

    const snapPx = snapSize * scale;
    const half = coneSize / 2;
    const hitSize = coneSize * 1.2;
    const badgeOffset = half * 0.7;

    // Field boundaries in canvas pixel coordinates
    const minPx = 0;
    const maxPxX = fieldWidth * scale;
    const maxPxY = fieldHeight * scale;

    return (
        <Group
            x={pixelX}
            y={pixelY}
            opacity={opacity}
            draggable
            onDragMove={(e) => {
                let x = e.target.x();
                let y = e.target.y();

                // Clamp to field boundaries
                x = Math.max(minPx, Math.min(maxPxX, x));
                y = Math.max(minPx, Math.min(maxPxY, y));

                // Snap
                if (snapPx > 0) {
                    x = Math.round(x / snapPx) * snapPx;
                    y = Math.round(y / snapPx) * snapPx;
                }

                // Re-clamp after snap (snap could push outside)
                x = Math.max(minPx, Math.min(maxPxX, x));
                y = Math.max(minPx, Math.min(maxPxY, y));

                e.target.x(x);
                e.target.y(y);
            }}
            onDragEnd={(e) => {
                let newX = e.target.x() / scale;
                let newY = fieldHeight - (e.target.y() / scale);

                // Clamp to field boundaries
                newX = Math.max(0, Math.min(fieldWidth, newX));
                newY = Math.max(0, Math.min(fieldHeight, newY));

                if (snapSize > 0) {
                    newX = Math.round(newX / snapSize) * snapSize;
                    newY = Math.round(newY / snapSize) * snapSize;
                }

                // Re-clamp after snap
                newX = Math.max(0, Math.min(fieldWidth, newX));
                newY = Math.max(0, Math.min(fieldHeight, newY));

                onDragEnd(cone.id, newX, newY);
            }}
            onClick={(e) => {
                e.cancelBubble = true;
                if (window.confirm('Delete this cone?')) {
                    onDelete(cone.id);
                }
            }}
            onContextMenu={(e) => {
                e.evt.preventDefault();
                onDelete(cone.id);
            }}
            onMouseEnter={(e) => {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'pointer';
            }}
            onMouseLeave={(e) => {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'default';
            }}
        >
            {/* Selection Area / Hit Area */}
            <Rect
                x={-hitSize / 2}
                y={-hitSize / 2}
                width={hitSize}
                height={hitSize}
                fill="transparent"
            />

            {imageMode && image ? (
                <KonvaImage
                    image={image}
                    width={coneSize}
                    height={coneSize}
                    offsetX={half}
                    offsetY={half}
                    shadowColor="black"
                    shadowBlur={3}
                    shadowOpacity={0.25}
                />
            ) : (
                <Circle
                    radius={half * 0.5}
                    fill={cone.status === 'PLACED' ? '#D97706' : '#FFFFFF'}
                    stroke="#D97706"
                    strokeWidth={1.5}
                    shadowColor="black"
                    shadowBlur={3}
                    shadowOpacity={0.2}
                />
            )}

            {/* Index Badge */}
            {cone.orderIndex !== undefined && cone.orderIndex !== null && (
                <Group x={badgeOffset} y={-badgeOffset}>
                    <Circle radius={Math.max(5, half * 0.4)} fill="#1F1F1F" />
                    <Text
                        text={(cone.orderIndex + 1).toString()}
                        fontSize={Math.max(6, half * 0.5)}
                        fill="#FFFFFF"
                        offsetX={Math.max(2, half * 0.15)}
                        offsetY={Math.max(3, half * 0.2)}
                        align="center"
                    />
                </Group>
            )}
        </Group>
    );
};

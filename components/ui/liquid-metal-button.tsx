"use client";

import { liquidMetalFragmentShader, ShaderMount } from "@paper-design/shaders";
import { Sparkles } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface LiquidMetalButtonProps {
  label?: string;
  onClick?: () => void;
  viewMode?: "text" | "icon";
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
  fullWidth?: boolean;
}

export function LiquidMetalButton({
  label = "Continuer",
  onClick,
  viewMode = "text",
  disabled = false,
  type = "button",
  className,
  fullWidth = false,
}: LiquidMetalButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const shaderRef = useRef<HTMLDivElement>(null);
  const shaderMount = useRef<ShaderMount | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rippleId = useRef(0);

  const dimensions = useMemo(() => viewMode === "icon"
    ? { width: 46, height: 46, innerWidth: 42, innerHeight: 42 }
    : { width: 142, height: 46, innerWidth: 138, innerHeight: 42 }, [viewMode]);

  useEffect(() => {
    if (!shaderRef.current) return;
    shaderMount.current?.dispose();
    try {
      shaderMount.current = new ShaderMount(shaderRef.current, liquidMetalFragmentShader, {
        u_repetition: 4,
        u_softness: 0.5,
        u_shiftRed: 0.3,
        u_shiftBlue: 0.3,
        u_distortion: 0,
        u_contour: 0,
        u_angle: 45,
        u_scale: 8,
        u_shape: 1,
        u_offsetX: 0.1,
        u_offsetY: -0.1,
      }, undefined, 0.6, undefined, 1, 300_000);
    } catch (error) {
      // WebGL is an enhancement: browsers without WebGL must keep the button usable.
      console.warn("Liquid metal shader unavailable; using the CSS fallback.", error);
      shaderMount.current = null;
      shaderRef.current.replaceChildren();
    }

    return () => {
      shaderMount.current?.dispose();
      shaderMount.current = null;
    };
  }, []);

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (disabled) return;
    shaderMount.current?.setSpeed(2.4);
    window.setTimeout(() => shaderMount.current?.setSpeed(isHovered ? 1 : 0.6), 300);
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const ripple = { x: event.clientX - rect.left, y: event.clientY - rect.top, id: rippleId.current++ };
      setRipples((current) => [...current, ripple]);
      window.setTimeout(() => setRipples((current) => current.filter((item) => item.id !== ripple.id)), 600);
    }
    onClick?.();
  }

  return (
    <span className={cn("liquid-metal-button", viewMode === "icon" ? "icon" : "text", disabled && "disabled", fullWidth && "full-width", className)} style={{ width: fullWidth ? "100%" : dimensions.width, height: dimensions.height }}>
      <span className="liquid-metal-button-layer liquid-metal-button-label" aria-hidden="true">
        {viewMode === "icon" ? <Sparkles size={16} /> : <span>{label}</span>}
      </span>
      <span className="liquid-metal-button-layer liquid-metal-button-inner" style={{ width: fullWidth ? "calc(100% - 4px)" : dimensions.innerWidth, height: dimensions.innerHeight }} aria-hidden="true" />
      <span className="liquid-metal-button-layer liquid-metal-button-shader" aria-hidden="true">
        <span ref={shaderRef} />
      </span>
      <button
        ref={buttonRef}
        type={type}
        className="liquid-metal-button-hit-area"
        disabled={disabled}
        aria-label={label}
        onClick={handleClick}
        onMouseEnter={() => { setIsHovered(true); shaderMount.current?.setSpeed(1); }}
        onMouseLeave={() => { setIsHovered(false); setIsPressed(false); shaderMount.current?.setSpeed(0.6); }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        data-pressed={isPressed ? "true" : "false"}
      >
        {ripples.map((ripple) => <span key={ripple.id} className="liquid-metal-ripple" style={{ left: ripple.x, top: ripple.y }} />)}
      </button>
    </span>
  );
}

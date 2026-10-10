"use client";

import React from "react";
import { motion, type MotionProps } from "motion/react";
import { cn } from "@/lib/utils";

interface GradientTextProps extends Omit<React.HTMLAttributes<HTMLElement>, keyof MotionProps> {
  className?: string;
  children: React.ReactNode;
  as?: React.ElementType;
}

function GradientText({ className, children, as: Component = "span", ...props }: GradientTextProps) {
  const MotionComponent = motion.create(Component);

  return (
    <MotionComponent className={cn("celian-gradient-text", className)} {...props}>
      {children}
      <span className="celian-gradient-text-lights" aria-hidden="true">
        <span className="celian-gradient-light light-one" />
        <span className="celian-gradient-light light-two" />
        <span className="celian-gradient-light light-three" />
        <span className="celian-gradient-light light-four" />
      </span>
    </MotionComponent>
  );
}

export { GradientText };

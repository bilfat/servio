"use client";

import React, { useState } from "react";
import { SlidersHorizontal, ArrowsCounterClockwise, CaretDown, CaretUp } from "@phosphor-icons/react";
import { useAfterSales } from "@/features/afterSales/useAfterSales";

interface DemoScenarioSwitcherProps {
  onSelectCase?: (caseId: string) => void;
  onSelectTab?: (tab: "active" | "submissions" | "expired") => void;
}

export function DemoScenarioSwitcher(_props: DemoScenarioSwitcherProps) {
  return null;
}

import * as Phosphor from "@phosphor-icons/react";
const checks = ["WhatsappLogo", "Lightbulb", "ShieldCheck", "Wrench", "Users", "ChartLineUp", "CheckSquareOffset", "HourglassMedium", "Storefront", "PaperPlaneTilt", "ArrowsClockwise", "Funnel"];
console.log(checks.map(c => [c, !!Phosphor[c]]));

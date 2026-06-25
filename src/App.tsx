import React from "react";
import { LoFiEngine } from "./engine/LoFiEngine";
import { fogCorridorGame } from "./games/fogCorridor.game";
import "./style.css";

export default function App() {
  return <LoFiEngine game={fogCorridorGame} />;
}
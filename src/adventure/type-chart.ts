import type { Element } from "./data";
const strong: Partial<Record<Element, Element[]>> = {
  fire: ["grass", "ice", "bug", "steel"],
  water: ["fire", "ground", "rock"],
  electric: ["water", "flying"],
  grass: ["water", "ground", "rock"],
  ice: ["grass", "ground", "flying", "dragon"],
  fighting: ["normal", "ice", "rock", "dark", "steel"],
  poison: ["grass", "fairy"],
  ground: ["fire", "electric", "poison", "rock", "steel"],
  flying: ["grass", "fighting", "bug"],
  psychic: ["fighting", "poison"],
  bug: ["grass", "psychic", "dark"],
  rock: ["fire", "ice", "flying", "bug"],
  ghost: ["psychic", "ghost"],
  dragon: ["dragon"],
  dark: ["psychic", "ghost"],
  steel: ["ice", "rock", "fairy"],
  fairy: ["fighting", "dragon", "dark"],
};
const weak: Partial<Record<Element, Element[]>> = {
  normal: ["rock", "steel"],
  fire: ["fire", "water", "rock", "dragon"],
  water: ["water", "grass", "dragon"],
  electric: ["electric", "grass", "dragon"],
  grass: ["fire", "grass", "poison", "flying", "bug", "dragon", "steel"],
  ice: ["fire", "water", "ice", "steel"],
  fighting: ["poison", "flying", "psychic", "bug", "fairy"],
  poison: ["poison", "ground", "rock", "ghost"],
  ground: ["grass", "bug"],
  flying: ["electric", "rock", "steel"],
  psychic: ["psychic", "steel"],
  bug: ["fire", "fighting", "poison", "flying", "ghost", "steel", "fairy"],
  rock: ["fighting", "ground", "steel"],
  ghost: ["dark"],
  dragon: ["steel"],
  dark: ["fighting", "dark", "fairy"],
  steel: ["fire", "water", "electric", "steel"],
  fairy: ["fire", "poison", "steel"],
};
const immune: Partial<Record<Element, Element[]>> = {
  normal: ["ghost"],
  electric: ["ground"],
  fighting: ["ghost"],
  poison: ["steel"],
  ground: ["flying"],
  psychic: ["dark"],
  ghost: ["normal"],
  dragon: ["fairy"],
};
export function matchup(attack: Element, defense: Element): number {
  return immune[attack]?.includes(defense)
    ? 0
    : strong[attack]?.includes(defense)
      ? 2
      : weak[attack]?.includes(defense)
        ? 0.5
        : 1;
}

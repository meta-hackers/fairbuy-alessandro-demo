import type { CategorySpec } from "../contract";
import { laptopSpec } from "./laptop";

// Every category the app supports. Adding one = a spec here plus its fixtures or connector.
export const categorySpecs: Readonly<Record<string, CategorySpec>> = {
  laptop: laptopSpec,
};

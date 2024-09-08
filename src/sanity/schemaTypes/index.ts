import { type SchemaTypeDefinition } from "sanity";
import { tileType } from "./tileType";
import { detailType } from "./detailType";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [tileType, detailType],
};

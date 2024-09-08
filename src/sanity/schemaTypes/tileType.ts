import { defineField, defineType } from "sanity";
import { SquareIcon } from "@sanity/icons";

export const tileType = defineType({
  name: "tile",
  title: "Tile",
  icon: SquareIcon,
  type: "document",
  fields: [
    defineField({
      name: "name",
      type: "string",
    }),
    defineField({
      name: "description",
      type: "string",
    }),
    defineField({
      name: "category",
      type: "string",
    }),
    defineField({
      name: "level",
      type: "number",
    }),
    defineField({
      name: "image",
      type: "image",
    }),
    defineField({
      name: "details",
      type: "array",
      of: [{ type: "detail" }],
    }),
    defineType({
      name: "upgrade",
      type: "reference",
      to: [{ type: "tile" }],
    }),
  ],
});

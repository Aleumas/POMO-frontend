import { defineField, defineType } from "sanity";

export const detailType = defineType({
  name: "detail",
  title: "Detail",
  type: "object",
  fields: [
    defineField({
      name: "name",
      type: "string",
    }),
    defineField({
      name: "value",
      type: "number",
    }),
  ],
});

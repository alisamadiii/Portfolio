import Anchor from "./Anchor";
import BlockQuote from "./BlockQuote";
import Code from "./Code";
import Heading from "./Heading";
import { List } from "./List";
import Text from "./Text";

export const Components = {
  h1: Heading,
  p: Text,
  ul: List,
  a: Anchor,
  blockquote: BlockQuote,
  code: Code,
};

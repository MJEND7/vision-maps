import { NodeVariants } from "@convex/nodes/table";
import BaseNode from "./BaseNode";
import TextNode from "./TextNode";
import AINode from "./AINode";
import ImageNode from "./ImageNode";
import VideoNode from "./VideoNode";
import AudioNode from "./AudioNode";
import LinkNode from "./LinkNode";
import TranscriptionNode from "./TranscriptionNode";

// Export all node components
export {
  BaseNode,
  TextNode,
  AINode,
  ImageNode,
  VideoNode,
  AudioNode,
  LinkNode,
  TranscriptionNode,
};

// Create nodeTypes configuration for React Flow
export const nodeTypes = {
  [NodeVariants.Text]: TextNode,
  [NodeVariants.AI]: AINode,
  [NodeVariants.Image]: ImageNode,
  [NodeVariants.Video]: VideoNode,
  [NodeVariants.Audio]: AudioNode,
  [NodeVariants.Link]: LinkNode,
  [NodeVariants.Transcription]: TranscriptionNode,
  [NodeVariants.YouTube]: LinkNode, // Use LinkNode for URL-based content
  [NodeVariants.Spotify]: LinkNode,
  [NodeVariants.AppleMusic]: LinkNode,
  [NodeVariants.Notion]: LinkNode,
  [NodeVariants.Figma]: LinkNode,
  [NodeVariants.GitHub]: LinkNode,
  [NodeVariants.Twitter]: LinkNode,
  [NodeVariants.Loom]: LinkNode,
  [NodeVariants.Excalidraw]: LinkNode,
};

export default nodeTypes;
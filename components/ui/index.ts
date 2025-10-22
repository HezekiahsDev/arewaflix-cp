// Re-export all video-related UI components
export {
  VideoActions,
  VideoDescription,
  VideoMeta,
  VideoMetadata,
  VideoPublisher,
  VideoTitle,
  type VideoActionsProps,
  type VideoDescriptionProps,
  type VideoMetaProps,
  type VideoMetadataProps,
  type VideoPublisherProps,
  type VideoTitleProps,
} from "./VideoMetadata";

export {
  default as VideoPlayer,
  VideoPlayerUtils,
  type VideoPlayerProps,
} from "./VideoPlayer";

export {
  default as VideoControls,
  VideoControlsUtils,
  type QualityOption,
  type VideoControlsProps,
} from "./VideoControls";

export {
  RelatedVideoCard,
  default as RelatedVideos,
  RelatedVideosGrid,
  RelatedVideosSidebar,
  RelatedVideosUtils,
  type RelatedVideoCardProps,
  type RelatedVideosGridProps,
  type RelatedVideosProps,
  type RelatedVideosSidebarProps,
} from "./RelatedVideos";

// Skeleton Loaders
export {
  FeaturedVideoSkeleton,
  HomeScreenSkeleton,
  ShortsRailSkeleton,
  SkeletonLoader,
  VideoCardSkeleton,
  VideoRailSkeleton,
} from "./SkeletonLoader";

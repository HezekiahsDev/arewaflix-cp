/**
 * See All Screen - Usage Examples
 *
 * This file demonstrates how to use the new See All functionality
 */

// Example 1: Navigation from any component
import { useRouter } from "expo-router";

function MyComponent() {
  const router = useRouter();

  // Navigate to different sections
  const goToTrending = () => router.push("/see-all/trending");
  const goToTop = () => router.push("/see-all/top");
  const goToExplore = () => router.push("/see-all/explore");
  const goToShorts = () => router.push("/see-all/shorts");
}

// Example 2: Adding a new section
// In app/see-all/[section].tsx, add to sectionConfig:
/*
const configs: Record<SectionType, SectionConfig> = {
  // ... existing sections
  newSection: {
    title: "New Section Title",
    fetchFunction: (page: number) =>
      fetchFilteredVideos("latest", { limit: ITEMS_PER_PAGE, page }),
  },
};
*/

// Example 3: Customizing pagination
/*
// Change items per page
const ITEMS_PER_PAGE = 30; // Default is 20

// Change load more trigger point
onEndReachedThreshold={0.3} // Default is 0.5 (50% from bottom)

// Change batch size
maxToRenderPerBatch={15} // Default is 10
*/

// Example 4: Custom video card layout
/*
// Adjust grid columns
const NUM_COLUMNS = 3; // Default is 2

// Adjust card dimensions
const CARD_HEIGHT = 280; // Default is 260
const THUMBNAIL_HEIGHT = 180; // Default is 160
*/

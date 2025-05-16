import { Preferences } from "@capacitor/preferences";
import { PhotoData } from "./camera.service";
import { getCurrentUser, getUserById, getUsersByIds, User } from "./auth.service";
import { getCurrentLocation, getLocationName, calculateDistance } from "./location.service";

// Key for stories in storage
const STORIES_STORAGE_KEY = "stories";
const VIEWED_STORIES_KEY = "viewed_stories";

export interface Story {
  id: string;
  userId: string;
  photoData: PhotoData;
  createdAt: number;
  expiresAt: number; // 24 hours after creation
  locationName?: string;
  likes?: string[]; // Tableau des IDs des utilisateurs qui ont aimé la story
}

export interface StoryWithUser extends Story {
  user: User;
  viewed: boolean;
  location?: GeolocationCoordinates; // Ajouté pour maintenir la compatibilité
}

/**
 * Get IDs of viewed stories
 * @returns Array of story IDs
 */
export const getViewedStories = async (): Promise<string[]> => {
  try {
    const result = await Preferences.get({ key: VIEWED_STORIES_KEY });

    if (!result.value) {
      return [];
    }

    return JSON.parse(result.value);
  } catch (error) {
    console.error("Error getting viewed stories:", error);
    return [];
  }
};

/**
 * Create a new story
 * @param photoData Photo data for the story
 * @returns Created story
 */
export const createStory = async (photoData: PhotoData): Promise<Story> => {
  try {
    // Get current user
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    const now = Date.now();
    // Stories expire after 24 hours
    const expiresAt = now + 24 * 60 * 60 * 1000;

    // Get location name if location data is available
    let locationName: string | undefined = undefined;
    if (photoData.location) {
      try {
        locationName = await getLocationName(photoData.location.latitude, photoData.location.longitude);
      } catch (error) {
        console.error("Error getting location name:", error);
      }
    }

    const newStory: Story = {
      id: `story_${now}`,
      userId: currentUser.id,
      photoData,
      createdAt: now,
      expiresAt,
      locationName,
    };

    // Get existing stories
    const stories = await getAllStories();

    // Add new story
    stories.push(newStory);

    // Save updated stories
    await Preferences.set({
      key: STORIES_STORAGE_KEY,
      value: JSON.stringify(stories),
    });

    return newStory;
  } catch (error) {
    console.error("Error creating story:", error);
    throw error;
  }
};

/**
 * Get all active stories (not expired)
 * @returns Array of stories
 */
export const getAllStories = async (): Promise<Story[]> => {
  try {
    const result = await Preferences.get({ key: STORIES_STORAGE_KEY });

    if (!result.value) {
      return [];
    }

    const stories: Story[] = JSON.parse(result.value);

    // Filter out expired stories
    const now = Date.now();
    const activeStories = stories.filter((story) => story.expiresAt > now);

    // If we filtered out any stories, update storage
    if (activeStories.length < stories.length) {
      await Preferences.set({
        key: STORIES_STORAGE_KEY,
        value: JSON.stringify(activeStories),
      });
    }

    return activeStories;
  } catch (error) {
    console.error("Error getting all stories:", error);
    return [];
  }
};

/**
 * Get stories for feed (from users the current user follows)
 * @returns Array of stories with user data
 */
export const getFeedStories = async (): Promise<StoryWithUser[]> => {
  try {
    // Get current user
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    // Get viewed story IDs
    const viewedStories = await getViewedStories();

    // Get all stories
    const allStories = await getAllStories();

    // Get the following list, include the current user's ID for testing
    const following = [...(currentUser.following || []), currentUser.id];

    // Filter stories by users the current user follows
    const feedStories = allStories.filter((story) => following.includes(story.userId));

    // Sort by creation date (newest first)
    feedStories.sort((a, b) => b.createdAt - a.createdAt);

    // Get user data for each story
    const storiesWithUsers = await Promise.all(
      feedStories.map(async (story) => {
        const user = await getUserById(story.userId);

        if (!user) {
          throw new Error("User not found");
        }

        return {
          ...story,
          user,
          viewed: viewedStories.includes(story.id),
        };
      })
    );

    return storiesWithUsers;
  } catch (error) {
    console.error("Error getting feed stories:", error);
    return [];
  }
};

/**
 * Get stories from nearby users
 * @param maxDistance Maximum distance in kilometers
 * @returns Array of stories with user data
 */
export const getNearbyStories = async (maxDistance: number = 20): Promise<StoryWithUser[]> => {
  try {
    // Get current user
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    // Get current location
    const currentLocation = await getCurrentLocation();

    if (!currentLocation) {
      // If location is not available, return empty array
      return [];
    }

    // Get viewed story IDs
    const viewedStories = await getViewedStories();

    // Get all stories
    const allStories = await getAllStories();

    // Filter stories with location data
    const storiesWithLocation = allStories.filter((story) => story.photoData.location !== undefined);

    // Filter stories by distance
    const nearbyStories: Story[] = storiesWithLocation.filter((story) => {
      if (!story.photoData.location) return false;

      // Calculate distance between current location and story location
      const storyLocation = story.photoData.location;
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        storyLocation.latitude,
        storyLocation.longitude
      );

      return distance <= maxDistance;
    });

    // Sort by distance (closest first)
    nearbyStories.sort((a: Story, b: Story) => {
      if (!a.photoData.location || !b.photoData.location) return 0;

      const distanceA = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        a.photoData.location.latitude,
        a.photoData.location.longitude
      );

      const distanceB = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        b.photoData.location.latitude,
        b.photoData.location.longitude
      );

      return distanceA - distanceB;
    });

    // Get user data for each story
    const storiesWithUsers = await Promise.all(
      nearbyStories.map(async (story: Story) => {
        const user = await getUserById(story.userId);

        if (!user) {
          throw new Error("User not found");
        }

        return {
          ...story,
          user,
          viewed: viewedStories.includes(story.id),
        };
      })
    );

    return storiesWithUsers;
  } catch (error) {
    console.error("Error getting nearby stories:", error);
    return [];
  }
};

/**
 * Mark a story as viewed
 * @param storyId ID of the story to mark as viewed
 */
export const markStoryAsViewed = async (storyId: string): Promise<void> => {
  try {
    // Get current viewed stories
    const viewedStories = await getViewedStories();

    // Add story ID if not already viewed
    if (!viewedStories.includes(storyId)) {
      viewedStories.push(storyId);

      // Save updated viewed stories
      await Preferences.set({
        key: VIEWED_STORIES_KEY,
        value: JSON.stringify(viewedStories),
      });
    }
  } catch (error) {
    console.error("Error marking story as viewed:", error);
    throw error;
  }
};

/**
 * Delete a story
 * @param storyId ID of the story to delete
 * @returns True if story was deleted successfully
 */
export const deleteStory = async (storyId: string): Promise<boolean> => {
  try {
    // Get current user
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    // Get all stories
    const allStories = await getAllStories();

    // Find story
    const storyIndex = allStories.findIndex((story) => story.id === storyId);

    if (storyIndex === -1) {
      return false;
    }

    // Check if user is the owner of the story
    const story = allStories[storyIndex];
    if (story.userId !== currentUser.id) {
      throw new Error("Unauthorized to delete this story");
    }

    // Remove story
    allStories.splice(storyIndex, 1);

    // Save updated stories
    await Preferences.set({
      key: STORIES_STORAGE_KEY,
      value: JSON.stringify(allStories),
    });

    return true;
  } catch (error) {
    console.error("Error deleting story:", error);
    throw error;
  }
};

/**
 * Save all stories to storage
 * @param stories Stories to save
 */
const saveAllStories = async (stories: Story[]): Promise<void> => {
  try {
    await Preferences.set({
      key: STORIES_STORAGE_KEY,
      value: JSON.stringify(stories),
    });
  } catch (error) {
    console.error("Error saving stories:", error);
    throw error;
  }
};

/**
 * Ajoute un like à une story
 * @param storyId ID de la story
 * @returns Promise avec le résultat de l'opération
 */
export const likeStory = async (storyId: string): Promise<boolean> => {
  try {
    console.debug("likeStory", { storyId });

    const stories = await getAllStories();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    // Trouver la story à liker
    const storyIndex = stories.findIndex((s) => s.id === storyId);
    if (storyIndex === -1) {
      throw new Error("Story not found");
    }

    // Ajouter le like s'il n'existe pas déjà
    const story = stories[storyIndex];
    const likes = story.likes || [];
    
    if (!likes.includes(currentUser.id)) {
      likes.push(currentUser.id);
      story.likes = likes;
      
      // Mettre à jour la story dans le stockage
      stories[storyIndex] = story;
      await saveAllStories(stories);
      
      console.info("Story liked successfully", { storyId });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error liking story", { storyId, error });
    throw error;
  }
};

/**
 * Retire un like d'une story
 * @param storyId ID de la story
 * @returns Promise avec le résultat de l'opération
 */
export const unlikeStory = async (storyId: string): Promise<boolean> => {
  try {
    console.debug("unlikeStory", { storyId });

    const stories = await getAllStories();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    // Trouver la story
    const storyIndex = stories.findIndex((s) => s.id === storyId);
    if (storyIndex === -1) {
      throw new Error("Story not found");
    }

    // Retirer le like s'il existe
    const story = stories[storyIndex];
    if (!story.likes) {
      return false;
    }
    
    const likeIndex = story.likes.indexOf(currentUser.id);
    if (likeIndex !== -1) {
      story.likes.splice(likeIndex, 1);
      
      // Mettre à jour la story dans le stockage
      stories[storyIndex] = story;
      await saveAllStories(stories);
      
      console.info("Story unliked successfully", { storyId });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error unliking story", { storyId, error });
    throw error;
  }
};

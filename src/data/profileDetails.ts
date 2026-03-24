export type ProfileDetails = {
  headline: string;
  intro: string;
  about: string;
};

export const PROFILE_DETAILS_BY_ID: Record<string, ProfileDetails> = {
  "1": {
    headline: "Clinical psychologist",
    intro:
      "Alexandra supports adults navigating anxiety, burnout, and life transitions with a warm, structured approach.",
    about:
      "She integrates evidence-based frameworks with practical tools you can use between sessions.",
  },
  "2": {
    headline: "Licensed therapist",
    intro:
      "Alex focuses on building resilience and communication skills for individuals and couples.",
    about:
      "Sessions emphasize collaboration, clear goals, and sustainable change.",
  },
  "3": {
    headline: "LCSW",
    intro:
      "Jordan works with young professionals on stress, identity, and relationships.",
    about:
      "A strengths-based style with room for humor and honest conversation.",
  },
};

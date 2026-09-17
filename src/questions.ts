const intentCriteria = {
  statement: "Sharing information, an observation, or a factual claim",
  question: "Seeking information, clarification, or an answer",
  request: "Asking someone to do or provide something",
  complaint: "Expressing dissatisfaction and wanting acknowledgment or resolution",
  praise: "Expressing approval, gratitude, or admiration",
  plan: "Proposing or describing a future course of action",
  warning: "Alerting someone to danger, risk, or consequences",
  disclosure: "Revealing personal, private, or previously withheld information",
  other: "None of the other communicative intents clearly apply",
} as const;

const emotionCriteria = {
  neutral: "No strong emotion is expressed",
  happy: "Contentment, pleasure, gratitude, or joy",
  excited: "High-energy anticipation, enthusiasm, or delight",
  sad: "Sorrow, disappointment, grief, or loneliness",
  angry: "Anger, hostility, resentment, or outrage",
  anxious: "Worry, fear, nervousness, or unease",
  affectionate: "Warmth, fondness, care, or love",
  sarcastic: "Mocking, ironic, or contemptuous humor",
} as const;

const perspective = "Assess only what the speaker expresses in `message`, not their actual psychological state. Distinguish quoted or described people's emotions from the speaker's own tone; account for negation and context.";

export const signalQuestions = {
  intent: {
    type: "choice",
    instructions: "What is the primary communicative intent of the speaker in `message`? Distinguish their own intent from quoted speech.",
    criteria: intentCriteria,
  },
  emotion: {
    type: "choice",
    instructions: "What is the dominant emotional tone expressed by the speaker in `message`? " + perspective,
    criteria: emotionCriteria,
  },
  urgency: {
    type: "noul",
    instructions: "Does the speaker's message in `message` convey urgency or call for immediate attention? Distinguish a present call for action from quoted or hypothetical urgency.",
  },
  intensity: {
    type: "score",
    instructions: "How strongly does the speaker express emotion in `message`, regardless of which emotion it is? " + perspective + " Assess expression, not certainty about an emotion label; punctuation alone is not sufficient evidence.",
    criteria: [
      "The speaker conveys facts or asks a question without expressing an emotional reaction.",
      "The speaker expresses a restrained preference or slight feeling, such as mild pleasure or minor annoyance, without emphasis.",
      "The speaker explicitly expresses a definite emotional reaction, such as happiness, frustration, or worry, in measured language.",
      "The speaker emphatically expresses emotion through vivid language, strong emphasis, or repeated emotional statements.",
      "The speaker expresses overwhelming emotion that dominates the message, such as ecstatic celebration, furious outrage, or acute panic.",
    ],
  },
} as const;

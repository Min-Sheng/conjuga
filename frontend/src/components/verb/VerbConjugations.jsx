import { moodOrder } from "../../verbLabels";
import { MoodSection } from "./MoodSection";

export function VerbConjugations({ result }) {
  return <div className="verb-moods">
    {[...moodOrder, ...Object.keys(result.conjugations).filter((mood) => !moodOrder.includes(mood))]
      .filter((mood) => result.conjugations[mood])
      .map((mood, index) => <MoodSection key={mood} mood={mood} tenses={result.conjugations[mood]} initiallyOpen={index === 0} />)}
  </div>;
}

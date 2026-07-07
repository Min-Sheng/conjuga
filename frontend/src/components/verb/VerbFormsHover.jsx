import { isVerb, normalize } from "../../lib/wordUtils";
import { tenseLabels } from "../../verbLabels";

export function VerbFormsHover({ word, words, onOpen }) {
  if (!isVerb(word)) return null;
  const lemma = word.lemma || word.canonicalWord || word.word;
  const forms = words.filter((item) =>
    isVerb(item) &&
    normalize(item.lemma || item.canonicalWord || item.word) === normalize(lemma)
  );
  return <div className="library-verb-hover" onClick={(event) => event.stopPropagation()}>
    <div className="library-verb-hover-head">
      <span className="ibv-eyebrow">Formas guardadas</span>
      <strong>{lemma}</strong>
    </div>
    <div className="library-verb-hover-list">
      {forms.map((item) => <button key={item.id} onClick={() => onOpen({ ...item, lookupSurfaceForm: item.word })}>
        <strong>{item.word}</strong>
        <span>{item.person || (normalize(item.word) === normalize(lemma) ? "原形" : "變位")}
          {item.tense ? ` · ${tenseLabels[item.tense] || item.tense}` : ""}
        </span>
      </button>)}
    </div>
  </div>;
}

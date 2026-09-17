# Jev Signal

A live semantic signal visualizer powered by TypeSafe AI's Jev model. As text is entered, the app evaluates intent, emotion, urgency, and emotional intensity in one request. Emotion probabilities determine the particle colors; the intensity Score controls movement independently of confidence.

The headline shows close alternatives when the leading probabilities differ by less than 15 percentage points, and "unclear" when no emotion reaches 40%. These are display heuristics, not calibrated correctness thresholds. The inspector explains confidence, exposes the exact questions and intensity rubric, and lets you freeze a completed response as a baseline. Edit the text and compare intent/emotion probability changes, urgency, and intensity. The baseline stays in memory for the current page session and requires no additional API call.

## Run locally

The session-cost box totals received token usage in memory and resets on refresh. It estimates USD using the TypeSafe September 2026 cookbook's Jev 1.12 rates ($0.042 per million input tokens, $0 output); the Jev 1.13 account rate is unconfirmed. Rates live in `src/cost.ts`. Started requests finish to collect usage even if their answers are superseded by edits. Failed requests without usage reports are flagged and excluded; this is not an account billing ledger and excludes hosting fees.

Requires Node.js 20.19+ or 22.12+ and a TypeSafe API key.

```bash
cp .env.example .env
npm install
npm run dev
```

Set `TYPESAFE_API_KEY` in `.env`, then open <http://localhost:5173>. The API key is used only by the local Express server and is never sent to the browser.

```bash
npm run build
npm start
```

The production server runs at <http://localhost:3001> by default. Set `PORT` to override it.

## OpenAI Sites hosting

The same React interface is hosted with a server-side Worker (`worker.ts`). Both the local Express server and the hosted Worker use `api.ts` for Jev classification. `npm run build` produces the frontend in `dist/client` and the bundled Worker in `dist/server/index.js`; `npm test` checks the built Worker's API behavior with a simulated Jev response.

Set `TYPESAFE_API_KEY` as a **secret** in the Site's runtime settings, then deploy to apply it. Never put the key in `VITE_*` variables, the hosting manifest, or source control. The browser only calls the same-origin `/api/classify` route. Request logging is disabled in the SDK, and API responses are not cached.

The initial deployment is private and relies on Sites' audience controls. Before making it public, add appropriate authentication or usage limits to protect the Jev allowance; the origin check alone is not authentication or a rate limit.

---

# TypeSafe AI / Jev — Architecture Notes and Research Plan

## Executive Summary

TypeSafe AI's first model, **Jev**, appears substantially more interesting than “an LLM that reliably returns JSON.” Jev is presented as a **System One Model** optimized for fast, inexpensive, bounded semantic judgments rather than arbitrary natural-language generation. Its public interface centers on **Noul**, **Choice**, and **Score**, returning probability-bearing decisions instead of prose.

The initially puzzling claim is **“100% mathematically guaranteed type-safe output.”** If that merely meant “the application always receives a value conforming to a declared programming type,” it would be mundane. Validators, retries, fallbacks, grammars, and constrained decoding can already guarantee that around ordinary LLMs.

The deeper interpretation is much more interesting:

> **The declared decision type may be intrinsic to Jev's inference space rather than an external constraint applied to generated language.**

An LLM naturally computes over tokens and can subsequently be constrained into a type. Jev appears intended to compute a probability distribution directly over a declared semantic decision space. If so, an invalid output is not merely generated and rejected; it may literally have **no representable state** in the output space.

That would explain the company name **TypeSafe** and the insistence on exactly **100%**, rather than 99.9999999%.

The potentially important innovation is therefore not type safety alone. It is the architecture that may make type safety its natural state: bounded semantic output spaces, parallel rather than autoregressive sampling, native probabilities, calibration-oriented training, very low latency/cost, and direct composition with deterministic software.

TypeSafe says Jev combines a **new architecture**, a **new parallel sampler**, and **RLCD — Reinforcement Learning for Calibrated Decisions**. Public launch material does not yet explain enough implementation detail to know exactly how those mechanisms work.

The biggest unanswered question is:

> **How does Jev turn a dynamically user-defined semantic type—especially arbitrary `Choice` alternatives that did not exist during training—into a mathematically bounded inference space while evaluating those alternatives in parallel?**

We also have unusually early access: an account and API key obtained on the second day after launch. That gives us an opportunity to investigate Jev behaviorally rather than relying only on launch claims.

---

## 1. The System One Thesis

Frontier GPT/Claude-class models are appropriate for open-ended reasoning, planning, invention, architecture, code generation, explanation, and arbitrary language. Their interface is approximately:

```text
context → arbitrary generated token sequence
```

Jev targets situations in which the application already knows what semantic judgment it needs:

```text
state + declared decision → typed probabilistic result
```

Examples include whether a security event is malicious, whether code violates a requirement, which bounded action to select, how strongly an artifact satisfies a rubric, whether an agent trace contains jailbreak behavior, or whether a case should be automated or escalated.

A great deal of production AI currently invokes an expensive language model only to collapse its answer into a boolean, enum, score, ranking, or threshold. TypeSafe's thesis appears to be that **arbitrary language generation is unnecessary machinery for this class of workload**.

## 2. Jev's Decision Primitives

### Noul

`Noul` represents a yes/no proposition probabilistically:

```text
"is this event malicious?" → 0.973
P(true)  = 0.973
P(false) = 0.027
```

It is useful to think of Noul as an AI-native probabilistic cousin of `bool`. The exact etymology of **Noul** does not appear to have been publicly explained. It strongly evokes `Bool`, but assigning an official meaning to the “N” would currently be speculation.

### Choice

`Choice` represents a finite semantic decision space:

```text
LOW       0.01
MEDIUM    0.04
HIGH      0.87
CRITICAL  0.08
```

The important object is not generated text such as `"HIGH"`; it is the probability distribution over the declared alternatives.

### Score

`Score` represents a bounded score/rubric judgment.

The common theme is that the caller defines a bounded semantic output domain instead of asking for arbitrary prose.

## 3. Why “100% Type Safe” Sounds Mundane at First

If TypeSafe merely meant “the application always receives a correctly typed value,” the claim would not be interesting:

```typescript
type Severity = "low" | "medium" | "high";

function classify(input: string): Severity {
    const result = callLLM(input);
    if (result === "low" || result === "medium" || result === "high") return result;
    return "low"; // or reject, repair, retry, etc.
}
```

No matter what the model emits, invalid values cannot cross the application boundary. Modern constrained decoding is stronger still: a grammar/schema can mask illegal next tokens so structurally invalid generations are impossible.

Therefore **100% type conformance at the application boundary is already straightforward**.

This creates the central puzzle: why would a sophisticated AI company name itself *TypeSafe* and make “100% mathematically guaranteed type safety” a central slogan if that were all it meant?

## 4. External Type Safety vs. Native Type Safety

Ordinary LLM + validation:

```text
neural computation → token probabilities → arbitrary tokens → validator → typed value
```

LLM + constrained decoding:

```text
neural computation → token probabilities → token masking → legal token sequence → typed value
```

Jev's apparent proposition:

```text
state + declared semantic decision space
              ↓
       neural computation
              ↓
probability distribution over that space
              ↓
       typed program value
```

The conceptual difference is profound:

> **The model does not first inhabit an arbitrary output universe and then get constrained into a type. The type defines the universe over which inference occurs.**

If this is genuinely how Jev operates, “type safe” describes the natural topology of the output computation rather than a validation layer.

## 5. The “Natural State of Being” Interpretation

Imagine a handwritten-digit classifier with ten output units:

```text
[p0, p1, p2, p3, p4, p5, p6, p7, p8, p9]
```

Its output universe is `{0,1,2,3,4,5,6,7,8,9}`. It cannot output `elephant`, not because a validator catches it, but because **there is no `elephant` state in the output topology**.

Now consider:

```text
Choice { APPROVE, REJECT, REVIEW }
```

If Jev's inference object is intrinsically a distribution over exactly those alternatives, asking whether it might output `ESCALATE_TO_MARS` is almost a category error. There is no such state.

This yields the stronger interpretation:

> **TypeSafe did not merely make an AI that obeys types. It is attempting to make an AI whose intelligence exists inside types.**

## 6. Why Exactly 100% Matters

An empirical statement—“we ran one billion calls and observed zero schema violations”—can establish extremely high measured reliability, but not literal certainty.

A structural statement—“no state outside the declared codomain is representable”—is different. If true, the guarantee follows from construction.

This appears to explain the emphasis on `100%` rather than `99.9999999%`: the latter is a reliability statistic; the former is intended as an architectural invariant.

## 7. Type Safety Is Not Correctness

Three properties must remain separate:

- **Type safety:** Does the result belong to the declared output domain?
- **Calibration:** Do reported probabilities correspond to observed frequencies?
- **Semantic correctness:** Was this particular judgment right?

`malicious = 0.999` can be perfectly type-safe while completely wrong.

Likewise, “zero hallucinations” should be interpreted narrowly. Jev may eliminate **structural/out-of-domain hallucination** while remaining capable of semantic mistakes.

The powerful combination would be:

```text
bounded output
+ strong semantic accuracy
+ well-calibrated uncertainty
+ very low latency
+ very low cost
```

## 8. Giving Up Strings May Be the Central Trade

Strings are extraordinarily general. LLMs can produce essays, source code, explanations, dialogue, plans, arbitrary serialization, new labels, and novel structures. But if an application ultimately needs yes/no, one of six actions, or a bounded score, arbitrary language is representational overkill.

TypeSafe appears to deliberately give up that generality:

```text
no arbitrary strings
        ↓
bounded output universe
        ↓
mathematical type safety
        ↓
no sequential prose generation
        ↓
parallel sampling
        ↓
lower latency / cost
        ↓
native probability distributions
        ↓
calibration-oriented training
        ↓
easy deterministic composition
```

This makes type safety interesting not as an isolated feature, but as the **visible consequence of the architecture**.

## 9. Parallel Sampling and RLCD

Autoregressive LLM output is sequential at the decoding level:

```text
t1 → t2 → t3 → ... → tn
```

A bounded decision model can potentially avoid that loop. Instead of generating “I think the appropriate action is REVIEW,” it can directly estimate:

```text
P(APPROVE), P(REJECT), P(REVIEW)
```

If multiple judgments can also be evaluated in parallel against the same state, this begins to explain TypeSafe's latency and cost claims.

TypeSafe calls its training method **RLCD — Reinforcement Learning for Calibrated Decisions**. If confidence values are genuinely calibrated, deterministic software can own the risk policy:

```typescript
if (pMalicious >= 0.999) quarantineAutomatically();
else if (pMalicious >= 0.85) requireHumanReview();
else continueNormally();
```

The neural system supplies semantic uncertainty; the application decides what uncertainty is acceptable.

Calibration may matter more than raw accuracy. Two models can both be 95% accurate while one is dramatically more useful because it reliably knows which cases are uncertain.

## 10. The Biggest Architectural Mystery: Dynamic Choice Spaces

A fixed classifier is easy to understand. Jev becomes much more interesting if callers can dynamically define semantic choices such as:

```text
Choice {
    SEND_TO_SIEM,
    KILL_PROCESS,
    ISOLATE_ENDPOINT,
    WAKE_UP_CARLOS,
    DO_NOTHING
}
```

Those exact categories were not fixed output neurons during pretraining. Some mechanism must represent the alternatives, understand their semantics, compare them against the state/question, evaluate them, and construct a bounded probability distribution.

The critical research question is:

> **How does Jev make arbitrary user-declared semantic categories part of a mathematically bounded native inference space?**

This may be where the genuinely novel architecture resides.

## 11. Why This Is More Than Structured Outputs

It would be easy to summarize Jev as `LLM + JSON Schema`. That misses the central claim. Structured-output LLMs still fundamentally model `P(next token | context)`; the schema constrains token generation.

Jev appears intended to eliminate arbitrary token generation from the output mechanism for this class of workload.

The important comparison is not `malformed JSON vs. valid JSON`; it is:

```text
language generation vs. semantic decision inference
```

A concise version of the TypeSafe thesis is:

> **AI inference should have a codomain.**

Traditional software works naturally with `bool`, `int`, `float`, enums, structs, and functions. LLMs introduced an extraordinarily powerful universal primitive—effectively `string`—and the industry then built extensive infrastructure to turn those strings back into structured program values. TypeSafe asks why semantic machine judgment needs to pass through language at all.

## 12. Relationship to Frontier LLMs

Jev should not necessarily be viewed as a replacement for GPT/Claude-class models. The architectures are complementary:

```text
Environment / state
        │
        ├──→ Jev-like System One
        │      cheap judgments / probabilities / verification
        │
        └──→ GPT/Claude-like System Two
               planning / invention / architecture / code / hard reasoning
```

A deterministic orchestrator can decide when a cheap bounded judgment is sufficient and when expensive open-ended reasoning is warranted. That begins to look more like a computational cognitive architecture than simply “an LLM inside an app.”

## 13. Relevance to Converge / Spec-Kit

This architecture maps unusually well onto the planned **Converge / Spec-Kit multi-agent system**.

Instead of asking multiple expensive reasoning agents to produce long prose reviews for every rule, Jev could potentially act as a high-volume semantic assertion engine:

```text
SRP violation?                 0.91
unnecessary coupling?          0.73
SQL injection reachable?       0.02
authorization boundary safe?   0.997
duplicate abstraction?         0.81
spec requirement satisfied?    0.96
```

Then deterministic policy decides which findings matter and invokes a frontier reasoning/coding model only where needed:

```text
repository + specs + rules
          ↓
Jev semantic assertion layer
          ↓
probability matrix
          ↓
deterministic thresholds / policy
          ↓
Converge orchestration
          ↓
frontier coding / reasoning agents
          ↓
verification
```

Potential uses include requirement compliance, AppSec assertions, architectural rules, OOP/modularity checks, regression triage, critic/adversarial passes, agent-trace inspection, and deciding which findings deserve expensive System Two reasoning.

This could materially change the economics of evaluating hundreds or thousands of explicit rules across a repository.

## 14. Relationship to Continual Learning

Jev does **not** appear to solve continual learning. It does not, from public information, provide the missing ability to continually modify learned representations online without retraining, interference, or catastrophic forgetting.

It attacks a different weakness of contemporary AI:

> **LLMs conflate cognition with language generation.**

A future architecture could combine persistent memory/learning mechanisms, a Jev-like System One decision layer, frontier System Two reasoning, and deterministic orchestration.

## 15. Early API Research Plan

Because we have an API key, we can test the architecture behaviorally rather than relying solely on marketing.

### Type-domain invariance

Create bizarre and adversarial `Choice` domains and verify that responses contain exactly the declared members and nothing else. Test Unicode, long labels, semantically contradictory alternatives, duplicate/near-duplicate meanings, and labels containing instruction-like text.

### Dynamic semantic categories

Use obviously novel application-specific categories. Determine whether Jev robustly understands their meanings without requiring fixed ontology classes.

### Choice cardinality scaling

Benchmark `Choice` sizes such as `2, 4, 8, 16, 32, 64, 128...`. Measure latency, accuracy, normalization, and degradation. Scaling behavior may reveal something about the sampler.

### Multiple independent judgments

Hold context constant while increasing the number of Noul/Choice/Score judgments per request. Measure whether latency remains approximately flat, grows sublinearly, or grows linearly. This is one of the highest-value probes of the “parallel sampler” claim.

### Probability invariants

Verify that distributions remain finite, bounded, normalized, and structurally complete under pathological inputs, huge context, contradictions, and adversarial instructions.

### Calibration

Build datasets with known labels and collect enough predictions to evaluate reliability diagrams, Expected Calibration Error, Brier score, log loss, confidence buckets, and calibration under distribution shift.

### Semantic uncertainty

Construct cases where evidence is deliberately incomplete. A calibrated model should generally become less confident rather than merely selecting the most plausible option with extreme confidence.

### Distribution shift

Test across domains, time periods, writing styles, codebases, and security categories. Determine whether probabilities remain trustworthy out of distribution.

### Label sensitivity

Keep semantics constant while renaming options (`ALLOW/DENY`, `A/B`, `GREEN/RED`, `foo/bar`) and providing definitions separately. This can reveal dependence on label semantics versus supplied descriptions.

### Permutation invariance

Reorder identical choices repeatedly. Probability assigned to a semantic option ideally should not materially depend on position.

### Contradictory / overlapping choices

Create alternatives that are not mutually exclusive even though `Choice` forces a distribution. This should expose how Jev handles a badly specified codomain.

### Noul complement behavior

Compare logically complementary propositions such as “Is X malicious?” and “Is X benign?” Systematic inconsistencies could reveal useful properties of the decision mechanism.

### Cost and latency against frontier LLMs

For identical bounded-decision workloads, benchmark Jev against structured-output frontier LLM calls. Measure end-to-end latency, cost, accuracy, calibration, and operational complexity.

The most interesting result is not merely whether Jev is faster. It is **how much semantic intelligence survives when arbitrary generation is removed**.

## 16. Questions Public Material Does Not Yet Answer

1. What is the actual neural architecture?
2. What exactly does the parallel sampler do?
3. How are dynamically supplied choices represented internally?
4. Are candidates independently scored, jointly scored, or handled by another mechanism?
5. At which layer is the mathematical type guarantee established: architecture, sampler, API representation, or several layers simultaneously?
6. How exactly is RLCD implemented?
7. How well does calibration survive distribution shift?
8. How does latency scale with simultaneous decisions?
9. How does performance scale with `Choice` cardinality?
10. What model size and training regime underlie Jev?
11. Which benchmark gains survive independent replication?
12. What classes of task expose the limits of a System One model?
13. How much latent “reasoning” can occur without autoregressive output?
14. Is Jev best understood as a novel classifier/ranker family, something transformer-derived, or a genuinely new model family?
15. What exactly makes its native type system different from a sufficiently sophisticated constrained decoder at the mathematical level?

These questions matter more than the marketing slogan itself.

## 17. What Would Falsify the Strong Interpretation?

The strong architectural interpretation should not be assumed merely because the branding is compelling.

Evidence against it would include:

- discovering that Jev internally generates ordinary text and merely validates it;
- discovering that `Choice` is implemented primarily through conventional constrained token decoding;
- latency scaling almost exactly like autoregressive generation;
- probabilities behaving like post-hoc confidence scores rather than native distributions;
- severe order dependence among choice alternatives;
- poor calibration despite RLCD claims;
- benchmark advantages disappearing on independently designed workloads.

Even if some of these occur, Jev could still be a valuable engineering product. They would simply weaken the claim that TypeSafe represents a fundamentally new inference abstraction.

## 18. What Would Strongly Support the Thesis?

Evidence supporting a genuinely different architecture would include:

- strict output-domain invariance under adversarial conditions;
- near-flat or strongly sublinear latency as many judgments are added;
- graceful scaling across dynamically supplied `Choice` spaces;
- meaningful probability distributions over novel semantic alternatives;
- strong permutation invariance;
- independently verified calibration;
- large cost/latency advantages on decision workloads without major accuracy loss;
- technical disclosure showing that bounded decision spaces are native objects of inference rather than constrained serialized language.

The combination would be much more significant than any one property alone.

## 19. The Most Important Conceptual Takeaway

The initial reaction to “100% type safe” is correctly skeptical:

> Any LLM can be wrapped in a harness that guarantees a typed application boundary.

But that observation points directly toward the deeper possibility.

The interesting TypeSafe claim is not:

> “Our AI never returns malformed JSON.”

It is closer to:

> **“For this class of intelligence, arbitrary strings should not exist in the output state space at all.”**

If Jev really embodies that principle, then type safety is not a mundane convenience layered onto the model. It is the most visible expression of a different model/application boundary.

The conventional LLM abstraction is approximately:

```text
semantic intelligence → language → parser → software
```

The TypeSafe abstraction aspires to:

```text
semantic intelligence → typed probability → software
```

That removes language as an unnecessary intermediate representation.

And that may be the deeper idea behind the company's name.

## 20. Working Hypothesis

Our current working hypothesis is:

> **Jev is a learned semantic decision engine whose native output object is a probability distribution over a caller-declared bounded semantic domain, rather than an autoregressively generated string subsequently forced into a schema.**

If correct, the “100% mathematically guaranteed type safety” claim is not itself the breakthrough. It is a theorem-like consequence of the more important architectural choice.

The next step is empirical characterization of the API, followed by comparison against whatever deeper technical material TypeSafe publishes.

---

## References

- TypeSafe AI: <https://typesafe.ai>
- Jev documentation: <https://docs.typesafe.ai/introduction>

> **Status:** These notes deliberately distinguish documented TypeSafe claims from architectural inference. Where implementation details have not been publicly disclosed, hypotheses are labeled as such and should be tested rather than treated as fact.

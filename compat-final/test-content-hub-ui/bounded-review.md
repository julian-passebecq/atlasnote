# Spark execution quick assessment

Classification: {"subject":"it","path":["Data Engineering","Apache Spark"]}

## q2 - Which can cause a wide dependency / shuffle? Select all that apply.

- a: groupBy()
  Explanation: Usually redistributes rows by grouping key.
- b: join()
  Explanation: Can require redistribution unless the plan avoids it, e.g. broadcast.
- c: select()
  Explanation: Normally a narrow projection.
- d: orderBy()
  Explanation: Global ordering generally requires a shuffle.

Correct: a, b, d
Selected: 
Result: revealed
Explanation: Wide operations can require data movement across partitions.
Follow-up: Not supplied
Reflection: 
Tags: 
Attempt history:
```json
[
  {
    "id": "attempt.2d36b3be739cbe67a694f3d005cc1343",
    "setId": "sample-spark-qcm",
    "questionId": "q2",
    "selectedOptionIds": [
      "a",
      "b",
      "d"
    ],
    "correct": true,
    "answeredAt": 1789604973689,
    "attemptNumber": 1,
    "reflection": ""
  },
  {
    "id": "attempt.04f5d4a858a6d6bd9a6a6261aea0699e",
    "setId": "sample-spark-qcm",
    "questionId": "q2",
    "selectedOptionIds": [
      "a"
    ],
    "correct": false,
    "answeredAt": 1789604974024,
    "attemptNumber": 2,
    "reflection": ""
  },
  {
    "id": "attempt.9fe8b37dd098f864358d8b5dfe35894e",
    "setId": "sample-spark-qcm",
    "questionId": "q2",
    "selectedOptionIds": [],
    "correct": false,
    "answeredAt": 1789604974299,
    "attemptNumber": 3,
    "reflection": "",
    "revealed": true
  }
]
```
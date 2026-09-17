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
    "id": "attempt.019c86fad9c09787e77b2937b74b2633",
    "setId": "sample-spark-qcm",
    "questionId": "q2",
    "selectedOptionIds": [
      "a",
      "b",
      "d"
    ],
    "correct": true,
    "answeredAt": 1789604184665,
    "attemptNumber": 1,
    "reflection": ""
  },
  {
    "id": "attempt.78ff51e33c45b445eca6c3ca2457c3e5",
    "setId": "sample-spark-qcm",
    "questionId": "q2",
    "selectedOptionIds": [
      "a"
    ],
    "correct": false,
    "answeredAt": 1789604185017,
    "attemptNumber": 2,
    "reflection": ""
  },
  {
    "id": "attempt.ae3ad6b6063d3b14f1c825541b6c079e",
    "setId": "sample-spark-qcm",
    "questionId": "q2",
    "selectedOptionIds": [],
    "correct": false,
    "answeredAt": 1789604185298,
    "attemptNumber": 3,
    "reflection": "",
    "revealed": true
  }
]
```
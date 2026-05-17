# Security Specification - Nexlify Resource Hub

## Data Invariants
1. Students can only read curriculum modules, not create or modify them.
2. Students can only read and write their own progress document.
3. `unlockedModuleIndex` must be an integer and can only increase by 1 at a time (or stay same).
4. `completed` state can only be set to true if all modules are completed.

## The "Dirty Dozen" Payloads

1. **Identity Spoofing**: Attempt to write to `users/other-user-id` progress document.
2. **Module Tampering**: Attempt to create a fake module at `modules/malicious-module`.
3. **Module Deletion**: Attempt to delete a valid module.
4. **Progress Skip**: Attempt to set `unlockedModuleIndex` to 10 when current is 0.
5. **Admin Escalation**: Attempt to add an `isAdmin: true` field to the user profile (though not explicitly used, good practice).
6. **Shadow Field Injection**: Attempt to update a user progress document with a `ghostField: 'malicious'`.
7. **Negative Progress**: Attempt to set `unlockedModuleIndex` to -1.
8. **Invalid Resource Poisoning**: Inject a 1MB string into the `displayName` field.
9. **Unauthenticated Read**: Attempt to read any module without being logged in.
10. **Terminal State Reversal**: Attempt to set `completed: false` after the student has already finished.
11. **Spoofed Ownership**: Attempt to set `uid` in the payload to a different user's ID during document creation.
12. **Query Scraping**: Attempt a blanket `list` query on the `users` collection.

## Test Runner Plan
I will implement `firestore.rules` and verify them manually against these scenarios. I will also use `DRAFT_firestore.rules` initially.

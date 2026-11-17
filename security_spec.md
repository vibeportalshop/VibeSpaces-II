# VibeSpaces Security Specification & Red Team Audit

## 1. Data Invariants
1. **UserProfile (`/users/{userId}`)**:
   - `uid` must strictly equal `userId` and `request.auth.uid` on creation.
   - Users cannot self-assign `role` to `'owner'` or `'admin'` unless verified as an admin or bootstrapped owner (`co.vibecartel@gmail.com` / `aditya.shelke2011@gmail.com` with `email_verified == true`).
   - Private profiles (`isPrivate == true`) can only be read by their owner or a verified admin; public profiles (`isPrivate == false`) can be read by authenticated users.
2. **CustomRule (`/users/{userId}/rules/{ruleId}`)**:
   - Strictly isolated to the owner `userId == request.auth.uid` and requires parent `/users/{userId}` to exist (Master Gate).
3. **VibePost (`/vibes/{vibeId}`)**:
   - `authorId` must strictly equal `request.auth.uid` on creation and is immutable on update.
   - `createdAt` must strictly equal `request.time` on creation and is immutable on update.
4. **ChannelSpace (`/channelSpaces/{spaceId}`)**:
   - `ownerId` must strictly equal `request.auth.uid` on creation and is immutable on update.
   - Subcollection `/channelSpaces/{spaceId}/messages/{messageId}` enforces the Master Gate (`exists(/databases/$(database)/documents/channelSpaces/$(spaceId))`).
5. **DirectMessage (`/directMessages/{messageId}`)**:
   - Only readable/listable if `resource.data.senderId == request.auth.uid || resource.data.recipientId == request.auth.uid`.
   - `senderId` must equal `request.auth.uid` on creation.

## 2. The "Dirty Dozen" Payloads
1. **Shadow Field Injection on UserProfile**: `{ "uid": "u1", "displayName": "Alice", "createdAt": "SERVER_TIMESTAMP", "isSuperAdmin": true }` -> Rejected by `hasOnly()`.
2. **Self-Assigned Admin Escalation**: `{ "uid": "u1", "displayName": "Hacker", "role": "admin", "createdAt": "SERVER_TIMESTAMP" }` -> Rejected because non-admin users can only set `role == 'member'`.
3. **Identity Spoofing on VibePost**: `{ "title": "Hi", "content": "Spoofed", "authorId": "victim_uid", "authorName": "Victim", "createdAt": "SERVER_TIMESTAMP" }` -> Rejected because `authorId != request.auth.uid`.
4. **Unverified Admin Email Spoof**: Token has `email: "co.vibecartel@gmail.com"` with `email_verified: false` -> Rejected because `request.auth.token.email_verified == true` is mandatory.
5. **ID Poisoning (2KB Document ID)**: Creating `/vibes/<2000-char-id>` -> Rejected by `isValidId(vibeId)`.
6. **Denial-of-Wallet 1MB Content String**: Creating `/vibes/v1` with `content.size() > 2000` -> Rejected by `.size() <= 2000`.
7. **Timestamp Forgery**: Creating `/vibes/v1` with past `createdAt` -> Rejected by `incoming().createdAt == request.time`.
8. **Immutable Field Mutation**: Updating `authorId` or `createdAt` on `/vibes/v1` -> Rejected by `incoming().authorId == existing().authorId` and `affectedKeys().hasOnly(...)`.
9. **Orphaned Subcollection Write**: Creating `/channelSpaces/nonexistent/messages/m1` -> Rejected by Master Gate `exists(...)`.
10. **PII / Private Profile Leak**: Reading `/users/victim` when `resource.data.isPrivate == true` -> Rejected unless `request.auth.uid == userId || isAdmin()`.
11. **Unauthorized DM Scraping**: Listing `/directMessages` without filtering by `senderId` or `recipientId` -> Rejected by rule-enforced `resource.data.senderId == request.auth.uid || resource.data.recipientId == request.auth.uid`.
12. **Unbounded Array Injection**: Setting `interests` array to 50 items -> Rejected by `data.interests.size() <= 20`.

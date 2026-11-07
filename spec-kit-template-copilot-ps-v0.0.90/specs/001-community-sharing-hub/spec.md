# Project Specification: Local Item Sharing Hub (ShareHub)

**Feature Branch**: `001-community-sharing-hub`  
**Created**: 2026-11-06  
**Status**: Draft  
**Input**: User description: Create a localized community sharing hub where members list specialty items, browse nearby items, request to borrow, receive an owner decision, and rate completed borrows.

## Project Description

ShareHub helps people in a local community lend and borrow high-cost or specialty items, such as tools, equipment, and outdoor gear, instead of buying items they may use only occasionally. Members can publish item details and availability, find items by neighborhood or distance, coordinate borrow requests, and share feedback after a completed borrow.

## Purpose and Target Audience

The purpose is to make useful, infrequently needed items easier to access locally while helping owners keep control over when and to whom their items are lent. The target audience is community members who own items others may need temporarily and people seeking access to those items nearby.

## User Scenarios & Testing

### User Story 1 - Sign up as a member (Priority: P1)

A prospective member creates an account so they can list items, request to borrow, and build a history in the community.

**Why this priority**: Membership enables trust, ownership, and accountability across all sharing workflows.

**Independent Test**: A new person can register, verify their contact method, and reach an authenticated member experience.

**Acceptance Scenarios**:

1. **Given** a person has not registered, **When** they submit valid required account details, **Then** an account is created and they are prompted to verify their contact method before using member-only actions.
2. **Given** an account already exists for the submitted contact method, **When** the person tries to register again, **Then** registration is rejected with a clear recovery path and no duplicate account is created.
3. **Given** required account details are missing or invalid, **When** the person submits the form, **Then** the missing or invalid fields are identified and no account is created.
4. **Given** a member has verified their contact method, **When** they submit valid sign-in credentials, **Then** they can access member-only actions.
5. **Given** a member is signed in, **When** they choose to sign out, **Then** the current session ends and member-only actions require them to sign in again.

### User Story 2 - Create and manage item listings (Priority: P1)

An owner creates, views, edits, or removes a listing so nearby members can see what is available to borrow.

**Why this priority**: The community cannot share items until owners can maintain accurate listings.

**Independent Test**: An authenticated owner can create a complete listing, find it in their listings, update its details, and remove it when it is not committed to an approved borrow.

**Acceptance Scenarios**:

1. **Given** an authenticated member has an item to share, **When** they provide a title, description, one or more photos, category, condition, neighborhood, and availability dates, **Then** the listing is saved and visible to its owner.
2. **Given** an owner has a saved listing, **When** they open it, **Then** the current photos, category, condition, and availability dates are shown.
3. **Given** an owner has a listing with no conflicting approved borrow, **When** they update its details or availability, **Then** the updated information is saved and shown to other members.
4. **Given** an owner has a listing with no pending or approved borrow that would be affected, **When** they remove the listing, **Then** it is no longer available in community browsing and remains unavailable by its former public listing address.
5. **Given** a listing has an approved borrow overlapping the requested change or removal, **When** the owner attempts to change its committed dates or remove it, **Then** the change is blocked and the owner is told to resolve the borrow first.
6. **Given** a pending request would be invalidated by an owner's availability change, **When** the owner saves the change, **Then** the affected request is clearly identified to both participants and is not silently approved or discarded.
7. **Given** required listing details are missing or availability dates are invalid, **When** the owner tries to save the listing, **Then** the invalid fields are identified and the listing is not published.

### User Story 3 - Find a nearby item (Priority: P1)

A member browses and filters listings to find an item that is suitable and available nearby.

**Why this priority**: Local discovery connects item owners with people who need access to their items.

**Independent Test**: A member can browse listings and narrow results by neighborhood or distance, category, and requested availability dates.

**Acceptance Scenarios**:

1. **Given** available listings exist, **When** a member browses the community, **Then** each result shows enough information to compare items, including photo, category, condition, and availability.
2. **Given** a member chooses a neighborhood, **When** they apply the neighborhood filter, **Then** only matching listings are shown.
3. **Given** a member chooses a distance and availability date range, **When** they apply those filters, **Then** only listings within that distance and available for the full date range are shown.
4. **Given** filters match no listings, **When** results load, **Then** the member sees a clear empty state and can change or clear filters.
5. **Given** a member views a listing before an owner approves a request, **When** the listing is displayed, **Then** the owner's exact pickup address and private contact details are not exposed.

### User Story 4 - Request to borrow and receive an owner decision (Priority: P1)

A member requests an available date range, and the owner approves or declines the request.

**Why this priority**: A clear request and decision process is the core transaction between a borrower and an owner.

**Independent Test**: A borrower submits a request for an available listing, and its owner can approve or decline it with both members seeing the resulting status.

**Acceptance Scenarios**:

1. **Given** a member is viewing an item available for the requested dates, **When** they submit a borrow request with dates and a message, **Then** a pending request is created and visible to both participants.
2. **Given** a request is pending for an item they own, **When** the owner approves it, **Then** the request status becomes approved, the dates are reserved, and handoff details can be shared with the participants.
3. **Given** a request is pending for an item they own, **When** the owner declines it, **Then** the request status becomes declined and the item remains available if no other approved borrow reserves those dates.
4. **Given** a request is not pending or the member is not its owner, **When** they attempt to approve or decline it, **Then** the decision is rejected and the request state is unchanged.
5. **Given** an overlapping request was approved first, **When** the owner attempts to approve another request for the same dates, **Then** the conflicting approval is rejected and the owner is asked to select or coordinate a non-overlapping date range.
6. **Given** a member requests dates outside an item's availability, **When** they submit the request, **Then** it is rejected and the available dates are shown.

### User Story 5 - Complete a borrow and leave a rating (Priority: P2)

After an item is returned, the participants record completion and rate one another's sharing experience.

**Why this priority**: Ratings help community members make informed decisions, while completion records close the borrow lifecycle.

**Independent Test**: After a borrow is approved and the item is returned, its participants can record completion and each submit one rating for the other participant.

**Acceptance Scenarios**:

1. **Given** an approved borrow has ended and the item has been returned, **When** the owner confirms the return, **Then** the borrow is marked completed and both participants can rate the other.
2. **Given** a borrow is completed, **When** either participant submits a rating and optional written feedback for the other participant, **Then** the rating is saved and associated with that borrow.
3. **Given** a borrow is pending, declined, or not completed, **When** a participant attempts to submit a rating, **Then** the rating is rejected.
4. **Given** a participant has already rated the other participant for a completed borrow, **When** they try to submit another rating for the same borrow, **Then** the duplicate is rejected and the saved rating remains unchanged.
5. **Given** a member sees a published rating, **When** they report it with a reason, **Then** it is queued for moderation and the report is visible to authorized moderators.

### Edge Cases

- A listing has no photo, a photo cannot be displayed, or submitted photos exceed the supported count or size; the owner receives actionable validation and can correct the listing.
- An owner edits availability while requests are pending; pending requests are not silently approved, and any request made invalid by the change is clearly identified to its participants.
- An item becomes unavailable between search and request submission; the request is revalidated against current availability and is not accepted for conflicting dates.
- A member removes an account or listing with pending or approved borrows; unresolved borrows must be completed or explicitly resolved before removal.
- A member's location is unavailable; browsing remains usable by neighborhood, and the member is not required to reveal an exact address to browse.
- A rating contains abusive or identifying private information; members can report it for moderation, and public display follows community moderation rules.
- Two owners or borrowers attempt conflicting state changes at the same time; only a valid transition is accepted and participants see the current state.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST allow a person to register as a member and verify their contact method before member-only actions.
- **FR-002**: The system MUST allow an authenticated member to create, read, update, and delete their own item listings.
- **FR-003**: Each listing MUST include a title, description, one or more photos, category, condition, neighborhood, and availability dates.
- **FR-004**: The system MUST validate listing fields and date ranges before publishing or updating a listing.
- **FR-005**: The system MUST allow members to browse listings and filter by neighborhood or distance, category, and availability date range.
- **FR-006**: The system MUST show listing photo, category, condition, and availability in browse and detail views.
- **FR-007**: The system MUST keep exact pickup addresses and private contact details hidden from other members until an owner approves a borrow request.
- **FR-008**: The system MUST allow an authenticated member to request an item for a date range and MUST show the request status to both participants.
- **FR-009**: The system MUST allow only the item's owner to approve or decline a pending request.
- **FR-010**: An approved borrow MUST reserve the agreed dates; the system MUST prevent a conflicting approval for the same item and dates.
- **FR-011**: The system MUST prevent listing changes or deletion that conflict with an approved borrow, prevent deletion while pending requests exist, and identify any pending request affected by an availability change to both participants.
- **FR-012**: The system MUST allow the owner to confirm return and completion of an approved borrow.
- **FR-013**: After completion, each participant MUST be able to submit one rating for the other participant for that borrow.
- **FR-014**: The system MUST reject ratings for borrows that are not completed and duplicate ratings for the same participant and borrow.
- **FR-015**: The system MUST provide a way to report a rating for moderation.
- **FR-016**: The system MUST allow a verified member to start and end an authenticated session.

### Key Entities

- **Member**: A community participant with verified contact details, a chosen neighborhood or approximate location, account status, and a sharing history.
- **Item Listing**: An item offered by one owner, with descriptive text, photos, category, condition, neighborhood, availability, and listing status.
- **Borrow Request**: A request by one member to borrow another member's listed item for a date range, with a message, status, decision, and completion state.
- **Rating**: A score and optional written feedback from one participant to the other, tied to a completed borrow and subject to moderation.

### API Endpoints

The following resource endpoints describe the capabilities required by this specification. They do not prescribe a particular transport implementation beyond the listed HTTP method and path.

| Method | Endpoint | Purpose | Priority |
|---|---|---|---|
| `POST` | `/members` | Register a member and begin contact verification | P1 |
| `POST` | `/sessions` | Start an authenticated member session | P1 |
| `DELETE` | `/sessions/current` | End the current member session | P1 |
| `GET` | `/items` | Browse items; accept neighborhood, distance, category, and availability filters | P1 |
| `POST` | `/items` | Create an item listing | P1 |
| `GET` | `/items/{itemId}` | Read an item listing and its public details | P1 |
| `PATCH` | `/items/{itemId}` | Update an owned listing when changes do not conflict with approved borrows | P1 |
| `DELETE` | `/items/{itemId}` | Remove an owned listing when no unresolved borrow prevents removal | P1 |
| `POST` | `/items/{itemId}/borrow-requests` | Submit a borrow request for dates and a message | P1 |
| `GET` | `/borrow-requests` | List requests visible to the current member, optionally filtered by status or role | P1 |
| `GET` | `/borrow-requests/{requestId}` | Read a request visible to one of its participants | P1 |
| `PATCH` | `/borrow-requests/{requestId}` | Approve or decline a pending request as its owner | P1 |
| `POST` | `/borrow-requests/{requestId}/completion` | Confirm return and complete an approved borrow | P2 |
| `POST` | `/borrow-requests/{requestId}/ratings` | Submit one participant rating after completion | P2 |
| `GET` | `/members/{memberId}/ratings` | Read a member's published ratings | P2 |
| `POST` | `/ratings/{ratingId}/reports` | Report a rating for moderation | P2 |

### Implementation Priority

- **P1 - Minimum viable sharing**: Member registration and session access; item listing create/read/update/delete; browsing and local filters; borrow requests; owner approval or decline; privacy and availability safeguards.
- **P2 - Trust and lifecycle completion**: Return confirmation; participant ratings; rating reports and moderation workflow; published rating history.

### Assumptions

- Each member chooses a neighborhood or provides approximate location for local discovery; exact pickup details are shared only after approval.
- A listing owner confirms that an item has been returned. Both participants may then rate one another once for that borrow.
- Ratings use a bounded score with optional written feedback; moderation can hide reported content pending review.
- Payments, deposits, insurance, delivery, dispute resolution, and legal agreements are outside this initial project scope.
- The feature depends on a location source for distance filtering, photo upload and viewing capability for listings, and an operating moderation process for reported ratings; no external partner integration is assumed.

## Success Criteria

### Measurable Outcomes

- **SC-001**: At least 90% of first-time members can complete registration and contact verification in under 3 minutes during usability testing.
- **SC-002**: At least 90% of owners can publish a listing with required details and photos in under 5 minutes.
- **SC-003**: At least 90% of test participants can find an item matching their selected neighborhood or distance and date filters in under 2 minutes.
- **SC-004**: At least 95% of valid borrow requests appear in both participants' request views within 5 seconds of submission.
- **SC-005**: At least 90% of participants can submit a post-completion rating in under 2 minutes.
- **SC-006**: No tested unauthorized account can change another member's listing, decide their request, access hidden pickup details, or submit a rating on their behalf.

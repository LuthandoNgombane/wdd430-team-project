# Project Specification: Local Item Sharing Hub (NeighbourShare)

**Feature Branch**: `001-community-sharing-hub`  
**Created**: 2026-11-06  
**Last Updated**: 2026-11-12  
**Status**: Draft  
**Input**: User description: Create a localized community sharing hub where members list specialty items, browse nearby items, request to borrow, receive an owner decision, and rate completed borrows.

## Project Description

NeighbourShare helps people in a local community lend and borrow high-cost or specialty items, such as tools, equipment, and outdoor gear, instead of buying items they may use only occasionally. Members can publish item details and availability, find items in their neighborhood, coordinate borrow requests, and record when a borrowed item has been returned.

## Purpose and Target Audience

The purpose is to make useful, infrequently needed items easier to access locally while helping owners keep control over when and to whom their items are lent. The target audience is community members who own items others may need temporarily and people seeking access to those items nearby.

## Clarifications

### Session 2026-11-12

Scope was reviewed against the project board (issues #2–#11) for feasibility within a student team's timeline.

- Q: How is a member's contact method verified, and is it required for the first release? → A: Verification is by **email link only** (no phone/SMS). It moves to **P2**; in P1, members can use member-only actions immediately after sign-up.
- Q: Is distance-based filtering required? → A: No. Local discovery uses a **fixed list of neighborhoods**. Distance filtering is **out of scope**.
- Q: Is rating moderation required? → A: No. Reporting ratings and moderation are **out of scope**.
- Q: How are ratings handled? → A: Team decision: ratings exist **only as a database field**, a nullable `rating` (1–5) column on the borrow request. No rating screens, endpoints, or display are built in this scope. "Mark as returned" stays **P2** (User Story 5).
- Q: Which endpoint naming is authoritative? → A: The project board's `/api/*` naming (`/api/users`, `/api/listings`, `/api/requests`), matching Next.js route handlers. A refused request has status **rejected** (not "declined").
- Q: Are the profile page (board #3) and reservation dashboard (board #10) in scope? → A: Yes, both are **P1** (User Stories 6 and 7). Without the dashboard, owners cannot act on incoming requests.
- Q: What are the allowed categories, conditions, and neighborhoods? → A: Fixed lists defined under **Domain Values**. The team agreed on **8 neighborhoods**, two contributed by each of the four team members.
- Q: What are the photo limits? → A: Exactly **one photo** per listing, at most **5 MB**, JPEG, PNG, or WebP (team decision; previously 1–5 photos).
- Q: Can a listing have multiple availability windows? → A: No. Each listing has **one availability date range**. Dates are whole days, with start and end **inclusive**.
- Q: Can members filter listings by availability dates when browsing? → A: No (team decision). Browsing filters are **neighborhood and category only**. Availability is shown on the listing detail page and enforced when a request is submitted and approved. A date filter is out of scope.
- Q: Is a pickup address stored? → A: No. After approval, the borrower sees the owner's **contact details** and the two members arrange pickup and return themselves. No address field exists.
- Q: Can members delete their account? → A: Not in this scope. Account deletion is **out of scope**.
- Q: Can a borrower withdraw a request? → A: Yes, a borrower can **cancel a pending request** (P1). Cancelling an approved borrow is out of scope.
- Q: Can logged-out visitors browse? → A: Yes. Browsing and listing details are **public**; sending a request and all other actions require sign-in.
- Q: What happens to a pending request whose start date passes? → A: It is shown as **expired** and can no longer be approved; no background cleanup job is required.

## User Scenarios & Testing

### User Story 1 - Sign up as a member (Priority: P1)

A prospective member creates an account so they can list items, request to borrow, and build a history in the community.

**Why this priority**: Membership enables trust, ownership, and accountability across all sharing workflows.

**Independent Test**: A new person can register with an email address and password, sign in, and reach an authenticated member experience.

**Acceptance Scenarios**:

1. **Given** a person has not registered, **When** they submit valid required account details (name, email, password, neighborhood), **Then** an account is created and they can sign in.
2. **Given** an account already exists for the submitted email address, **When** the person tries to register again, **Then** registration is rejected with a clear recovery path and no duplicate account is created.
3. **Given** required account details are missing or invalid, **When** the person submits the form, **Then** the missing or invalid fields are identified and no account is created.
4. **Given** a member has an account, **When** they submit valid sign-in credentials, **Then** they can access member-only actions.
5. **Given** a member is signed in, **When** they choose to sign out, **Then** the current session ends and member-only actions require them to sign in again.
6. *(P2)* **Given** email verification is enabled and a person has just registered, **When** they open the verification link sent to their email before it expires, **Then** their email is marked verified; until then, member-only actions prompt them to verify and offer to resend the link.

### User Story 2 - Create and manage item listings (Priority: P1)

An owner creates, views, edits, or removes a listing so nearby members can see what is available to borrow.

**Why this priority**: The community cannot share items until owners can maintain accurate listings.

**Independent Test**: An authenticated owner can create a complete listing, find it in their listings, update its details, and remove it when it is not committed to an approved borrow.

**Acceptance Scenarios**:

1. **Given** an authenticated member has an item to share, **When** they provide a title, description, one photo, category, condition, neighborhood, and an availability date range, **Then** the listing is saved and visible to its owner.
2. **Given** an owner has a saved listing, **When** they open it, **Then** the current photo, category, condition, and availability dates are shown.
3. **Given** an owner has a listing with no conflicting approved borrow, **When** they update its details or availability, **Then** the updated information is saved and shown to other members.
4. **Given** an owner has a listing with no pending or approved borrow that would be affected, **When** they remove the listing, **Then** it is no longer available in community browsing and remains unavailable by its former public listing address.
5. **Given** a listing has an approved borrow overlapping the requested change or removal, **When** the owner attempts to change its committed dates or remove it, **Then** the change is blocked and the owner is told to resolve the borrow first.
6. **Given** a pending request would be invalidated by an owner's availability change, **When** the owner saves the change, **Then** the affected request is clearly identified to both participants and is not silently approved or discarded.
7. **Given** required listing details are missing or availability dates are invalid, **When** the owner tries to save the listing, **Then** the invalid fields are identified and the listing is not published.

### User Story 3 - Find a nearby item (Priority: P1)

A member or logged-out visitor browses and filters listings to find an item that is suitable and available in their neighborhood. Sending a request requires sign-in.

**Why this priority**: Local discovery connects item owners with people who need access to their items.

**Independent Test**: A member can browse listings and narrow results by neighborhood and category.

**Acceptance Scenarios**:

1. **Given** available listings exist, **When** a member browses the community, **Then** each result shows enough information to compare items, including photo, category, condition, and availability.
2. **Given** a member chooses a neighborhood from the supported list, **When** they apply the neighborhood filter, **Then** only matching listings are shown.
3. **Given** a member chooses a category, **When** they apply the category filter (alone or with a neighborhood), **Then** only matching listings are shown.
4. **Given** filters match no listings, **When** results load, **Then** the member sees a clear empty state and can change or clear filters.
5. **Given** a member views a listing before an owner approves a request, **When** the listing is displayed, **Then** the owner's private contact details are not exposed, and the listing's availability date range is shown.
6. **Given** a visitor is not signed in, **When** they open a listing's detail page, **Then** they can see its public details, but the request option prompts them to sign in.

### User Story 4 - Request to borrow and receive an owner decision (Priority: P1)

A member requests an available date range, and the owner approves or rejects the request.

**Why this priority**: A clear request and decision process is the core transaction between a borrower and an owner.

**Independent Test**: A borrower submits a request for an available listing, and its owner can approve or reject it with both members seeing the resulting status.

**Acceptance Scenarios**:

1. **Given** a member is viewing an item available for the requested dates, **When** they submit a borrow request with dates and a message, **Then** a pending request is created and visible to both participants.
2. **Given** a request is pending for an item they own, **When** the owner approves it, **Then** the request status becomes approved, the dates are reserved, and the borrower can see the owner's contact details to arrange pickup.
3. **Given** a request is pending for an item they own, **When** the owner rejects it, **Then** the request status becomes rejected and the item remains available if no other approved borrow reserves those dates.
4. **Given** a request is not pending or the member is not its owner, **When** they attempt to approve or reject it, **Then** the decision is rejected and the request state is unchanged.
5. **Given** an overlapping request was approved first, **When** the owner attempts to approve another request for the same dates, **Then** the conflicting approval is rejected and the owner is asked to select or coordinate a non-overlapping date range.
6. **Given** a member requests dates outside an item's availability, **When** they submit the request, **Then** it is rejected and the available dates are shown.
7. **Given** a member owns a listing, **When** they try to request their own listing, **Then** the request is rejected.
8. **Given** a borrower has a pending request, **When** they cancel it, **Then** its status becomes cancelled, the owner sees the change, and the request can no longer be approved.
9. **Given** a request is approved, rejected, or completed, **When** the borrower tries to cancel it, **Then** the cancellation is rejected and the request state is unchanged.
10. **Given** a request is still pending when its start date passes, **When** either participant views it, **Then** it is shown as expired and the owner can no longer approve it.

### User Story 5 - Mark a borrow as returned (Priority: P2)

After an item is returned, the owner records that the borrow is complete.

**Why this priority**: Completion closes the borrow lifecycle so both participants can see which borrows are finished, but the core sharing flow works without it.

**Independent Test**: After a borrow is approved and the item is returned, the owner can mark it as returned and both participants see it as completed.

**Acceptance Scenarios**:

1. **Given** an approved borrow and the item has been returned, **When** the owner marks it as returned, **Then** the request status becomes completed and both participants see the completed status.
2. **Given** a request is pending, rejected, cancelled, or already completed, **When** the owner attempts to mark it as returned, **Then** the action is rejected and the request state is unchanged.
3. **Given** a member is not the owner of the listing, **When** they attempt to mark the borrow as returned, **Then** the action is rejected and the request state is unchanged.

### User Story 6 - Manage my profile (Priority: P1)

A member maintains their profile so others know who they are sharing with, while private contact details stay protected.

**Why this priority**: Owners and borrowers need a name and neighborhood to decide whom to lend to, and contact details are needed to arrange handoff after approval.

**Independent Test**: A member can edit their profile, other members see only the public fields, and a borrower sees the owner's contact details only after approval.

**Acceptance Scenarios**:

1. **Given** a member is signed in, **When** they update their name, neighborhood, contact details (email and optional phone), or short bio with valid values, **Then** the changes are saved.
2. **Given** any visitor opens a member's public profile, **When** it is displayed, **Then** it shows only the member's name, neighborhood, bio, and active listings, never their contact details.
3. **Given** a borrow request is approved, **When** the borrower views that request, **Then** the owner's contact details are shown to the borrower so they can arrange pickup.
4. **Given** a request is pending, rejected, or cancelled, **When** the borrower views it, **Then** the owner's contact details remain hidden.

### User Story 7 - Track my listings and requests (Priority: P1)

A member uses a dashboard to see their listings, the requests they received as an owner, and the requests they sent as a borrower.

**Why this priority**: Owners cannot approve or reject requests, and borrowers cannot follow their requests, without one place showing them.

**Independent Test**: A member with listings and requests in each role sees each item in the correct dashboard section with its current status and available actions.

**Acceptance Scenarios**:

1. **Given** a member is signed in, **When** they open the dashboard, **Then** they see three sections: My listings, Incoming requests, and My requests.
2. **Given** an incoming request is pending, **When** the owner views it on the dashboard, **Then** they can approve or reject it from there.
3. **Given** a member has sent requests, **When** they view My requests, **Then** each shows a status badge (pending, approved, rejected, cancelled, completed, or expired), and pending ones can be cancelled.
4. **Given** a section has nothing to show, **When** the dashboard loads, **Then** that section shows an empty state with a helpful next step (for example, "Create a listing" or "Explore items").
5. **Given** a visitor is not signed in, **When** they open the dashboard address, **Then** they are redirected to sign in.

### Edge Cases

- A listing has no photo, its photo cannot be displayed, or the submitted photo exceeds 5 MB or uses an unsupported type; the owner receives actionable validation and can correct the listing.
- A request ending on the same day another approved request starts overlaps it, because date ranges are inclusive whole days.
- A pending request's start date passes without a decision; it is shown as expired and cannot be approved.
- An owner edits availability while requests are pending; pending requests are not silently approved, and any request made invalid by the change is clearly identified to its participants.
- An item becomes unavailable between search and request submission; the request is revalidated against current availability and is not accepted for conflicting dates.
- An owner tries to remove a listing with pending or approved borrows; unresolved borrows must be completed or explicitly resolved before removal.
- Browsing never requires a member to reveal an exact address; local discovery relies only on the member's chosen neighborhood.
- Two owners or borrowers attempt conflicting state changes at the same time; only a valid transition is accepted and participants see the current state.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST allow a person to register as a member with a unique email address. *(P2)* The system SHOULD verify the member's email address by a time-limited link before member-only actions once email verification is enabled.
- **FR-002**: The system MUST allow an authenticated member to create, read, update, and delete their own item listings.
- **FR-003**: Each listing MUST include a title, description, exactly one photo (JPEG, PNG, or WebP, at most 5 MB), category, condition, neighborhood, and one availability date range.
- **FR-004**: The system MUST validate listing fields and date ranges before publishing or updating a listing.
- **FR-005**: The system MUST allow members to browse listings and filter by neighborhood and category. Categories, conditions, and neighborhoods MUST come from the fixed lists under Domain Values. Browsing and listing details MUST be available without sign-in.
- **FR-006**: The system MUST show listing photo, category, condition, and availability in browse and detail views.
- **FR-007**: The system MUST keep a member's private contact details hidden from other members, showing an owner's contact details only to the borrower of an approved request. The system does not store pickup addresses.
- **FR-008**: The system MUST allow an authenticated member to request an item for a date range and MUST show the request status to both participants.
- **FR-009**: The system MUST allow only the item's owner to approve or reject a pending request.
- **FR-010**: An approved borrow MUST reserve the agreed dates; the system MUST prevent a conflicting approval for the same item and dates.
- **FR-011**: The system MUST prevent listing changes or deletion that conflict with an approved borrow, prevent deletion while pending requests exist, and identify any pending request affected by an availability change to both participants.
- **FR-012**: *(P2)* The system MUST allow only the listing owner to mark an approved borrow as returned, which sets its status to completed.
- **FR-013**: The data model MUST include a nullable `rating` field (integer 1–5) on each borrow request. No screen or endpoint sets or displays it in this project scope.
- **FR-014**: *(Removed 2026-11-12: rating submission rules are out of scope; ratings exist only as a database field.)*
- **FR-015**: *(Removed 2026-11-12: reporting ratings for moderation is out of scope.)*
- **FR-016**: The system MUST allow a registered member to start and end an authenticated session.
- **FR-017**: The system MUST allow a member to view and edit their own profile (name, neighborhood, contact details, short bio) and MUST show other visitors only the public profile fields.
- **FR-018**: The system MUST provide a signed-in dashboard listing the member's listings, incoming requests on their listings, and their own borrow requests with current status.
- **FR-019**: The system MUST allow only the borrower to cancel their own request, and only while it is pending.
- **FR-020**: The system MUST treat availability and request dates as whole days with inclusive start and end dates, and MUST treat a pending request whose start date has passed as expired and not approvable.
- **FR-021**: The system MUST reject a request from a member for their own listing.

### Key Entities

- **Member**: A community participant with a name, sign-in email address, chosen neighborhood, short bio, private contact details (email and optional phone), an email-verified flag (P2), account status, and a sharing history.
- **Item Listing**: An item offered by one owner, with descriptive text, one photo, category, condition, neighborhood, one availability date range, and listing status.
- **Borrow Request**: A request by one member to borrow another member's listed item for a date range, with a message, a stored status of `pending`, `approved`, `rejected`, `cancelled`, or `completed`, and a nullable `rating` (1–5) reserved for future use. `expired` is derived for display when a pending request's start date has passed; it is not stored.

### Domain Values

- **Categories**: Tools; Garden & Yard; Outdoor & Camping; Sports & Fitness; Electronics; Kitchen & Appliances; Party & Events; Other.
- **Conditions**: New; Like new; Good; Fair.
- **Neighborhoods**: A fixed list of 8 neighborhood names, two contributed by each team member. *(Names to be added here once all four members have submitted theirs.)*

These lists are implemented as TypeScript union types and used for both form options and server-side validation.

### API Endpoints

The following route handler endpoints describe the capabilities required by this specification and match the project board issues. Paths use Next.js App Router conventions (`app/api/.../route.ts`); `[id]` is a dynamic segment. If the chosen auth library (for example Auth.js) provides its own sign-in and sign-out routes, those replace the session endpoints below.

| Method | Endpoint | Purpose | Priority |
|---|---|---|---|
| `POST` | `/api/users` | Register a member | P1 |
| `GET` | `/api/users/me` | Read the signed-in member's full profile | P1 |
| `PATCH` | `/api/users/me` | Update the signed-in member's profile | P1 |
| `GET` | `/api/users/[id]` | Read a member's public profile and active listings | P1 |
| `POST` | `/api/auth/login` | Start an authenticated member session | P1 |
| `POST` | `/api/auth/logout` | End the current member session | P1 |
| `GET` | `/api/listings` | Browse listings; accept neighborhood and category filters | P1 |
| `POST` | `/api/listings` | Create a listing | P1 |
| `GET` | `/api/listings/[id]` | Read a listing and its public details | P1 |
| `PATCH` | `/api/listings/[id]` | Update an owned listing when changes do not conflict with approved borrows | P1 |
| `DELETE` | `/api/listings/[id]` | Remove an owned listing when no unresolved borrow prevents removal | P1 |
| `POST` | `/api/requests` | Submit a borrow request for a listing, with dates and a message | P1 |
| `GET` | `/api/requests` | List requests visible to the current member; filter by `role=owner\|borrower` and status | P1 |
| `GET` | `/api/requests/[id]` | Read a request visible to one of its participants | P1 |
| `PATCH` | `/api/requests/[id]` | Approve or reject a pending request as its owner, or cancel it as its borrower | P1 |
| `POST` | `/api/requests/[id]/completion` | Mark an approved borrow as returned (owner only) | P2 |
| `GET` | `/api/auth/verify` | Confirm an email verification token | P2 |

### Implementation Priority

- **P1 - Minimum viable sharing**: Member registration and session access; member profile; listing create/read/update/delete; public browsing with neighborhood and category filters; borrow requests and borrower cancellation; owner approval or rejection; reservation dashboard; privacy and availability safeguards.
- **P2 - Trust and lifecycle completion**: Mark as returned; email verification.

The `rating` field on borrow requests is part of the initial database schema; it has no associated feature work.

### Out of Scope

- Distance-based or map-based search, geocoding, and device location.
- Filtering browse results by availability dates.
- Rating screens, rating submission, written feedback, and displaying ratings on profiles.
- Reporting ratings, moderation workflows, and moderator/admin roles.
- Phone or SMS verification.
- Multiple availability windows per listing.
- Cancelling an approved borrow (participants arrange this between themselves).
- Storing pickup addresses; pickup is arranged by the participants using the owner's contact details.
- Deleting member accounts.
- Payments, deposits, insurance, delivery, dispute resolution, and legal agreements.

### Assumptions

- Each member chooses a neighborhood from a fixed list for local discovery; contact details are shared with a borrower only after approval, and the participants arrange pickup themselves.
- A listing owner confirms that an item has been returned.
- The `rating` field stores a 1–5 score so a rating feature can be added later without a schema change.
- The feature depends on photo upload and storage for listings. Email delivery is needed only for P2 email verification; in development, verification links may be logged to the server console instead of emailed.

## Success Criteria

### Measurable Outcomes

- **SC-001**: At least 90% of first-time members can complete registration and sign in in under 3 minutes during usability testing.
- **SC-002**: At least 90% of owners can publish a listing with required details and a photo in under 5 minutes.
- **SC-003**: At least 90% of test participants can find an item matching their selected neighborhood and category filters in under 2 minutes.
- **SC-004**: At least 95% of valid borrow requests appear in both participants' request views within 5 seconds of submission.
- **SC-005**: At least 90% of owners can mark an approved borrow as returned in under 1 minute.
- **SC-006**: No tested unauthorized account can change another member's listing, decide or complete their request, or access another member's hidden contact details.

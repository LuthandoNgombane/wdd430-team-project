export const CATEGORIES = ['Tools', 'Garden & Yard', 'Outdoor & Camping', 'Sports & Fitness', 'Electronics', 'Kitchen & Appliances', 'Party & Events', 'Other'] as const;
export const CONDITIONS = ['New', 'Like new', 'Good', 'Fair'] as const;
export const REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'cancelled', 'completed'] as const;
export type Category = (typeof CATEGORIES)[number];
export type Condition = (typeof CONDITIONS)[number];
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
// Read neighborhood options from the neighborhoods table after configuration.
// Their eight names are still TBD in the authoritative spec.

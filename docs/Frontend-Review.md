# Stitch AI Frontend UI Review

Based on an analysis of the 8 Stitch AI HTML prototypes, the overall design is beautiful and modern. However, because it is a static generated UI, there are several UI/UX states and flows missing that we will need to implement during the React conversion.

Here is the breakdown of necessary improvements to make this enterprise-ready without redesigning the core look and feel.

## 1. Missing Pages
* **Registration / Onboarding Page:** There is a Login page, but no way for a new Company or Admin to register.
* **Forgot / Reset Password Page:** The Login page has a "Forgot password?" link that currently points nowhere.
* **History Page:** The Bottom Navigation explicitly has a "History" tab, but no corresponding History page was generated.
* **User Profile Page:** The avatar in the Top App Bar is clickable, but there is no page to view or edit user profile details (name, email, password change).

## 2. Duplicate / Overlapping Pages
* **Knowledge Library vs. Semantic Search:** Both serve almost identical purposes (searching and browsing documents). We should consolidate Semantic Search into the Knowledge Library's search bar to avoid fragmenting the user experience.

## 3. Broken / Missing Navigation
* **Static Hrefs:** All navigation links (`<a href="#">`) are dead. These will be replaced with React Router (`<Link>`).
* **Sidebar vs. Bottom Nav Sync:** The desktop sidebar and mobile bottom nav don't perfectly align in their destinations (e.g., Sidebar has "Projects" while Bottom Nav has "Sources"). We will unify these routes.

## 4. Missing Forms & Inputs
* **Role/Department Creation:** The System Settings page lacks the actual modal forms needed to create a new Department or Role.
* **User Invitation Form:** No specific form to invite a new employee via email.

## 5. Missing Loading States
* **Auth:** The Login button lacks a loading spinner for when the authentication request is in flight.
* **AI Chat:** When a message is sent, there is no "AI is typing..." or skeleton loader state before the response arrives.
* **Data Fetching:** Document lists (Library, Dashboard) lack skeleton loaders for initial page loads.

## 6. Missing Error States
* **Login Errors:** No UI placeholder for "Invalid credentials" or "Account locked" errors.
* **Upload Errors:** The upload page has a "Success" toast notification, but no "Error" toast for file size limits or invalid formats.
* **Chat Errors:** No graceful fallback UI if the LLM service times out or fails.

## 7. Missing Empty States
* **Empty Chat:** The Chat page starts with a pre-filled conversation. We need a "New Chat" empty state with just the welcome message and prompt suggestions.
* **Empty Library:** If a company has 0 documents, the library needs a call-to-action (CTA) to "Upload your first document".

## 8. Missing Authentication Flow
* **Protected Routes:** The UI assumes the user is always logged in. We need to implement route guards that redirect unauthenticated users back to the Login page.

## 9. Missing Role-Based UI
* **Conditional Rendering:** Currently, buttons like "Upload Documentation" and links to "System Settings" are visible to everyone. These must be conditionally hidden if the `roleId` stored in the JWT lacks the `documents:upload` or `settings:manage` permissions.

## 10. Responsive Consistency
* **Chat Input on Mobile:** On smaller screens, the chat input box might overlap with the mobile bottom navigation. Padding needs to be dynamically adjusted (`pb-safe` plus extra margin).

---

### Recommendation
Do **NOT** go back to Stitch to regenerate these. These are standard implementation details (loading spinners, error toasts, React Router links, conditional rendering) that are much faster and easier to add directly into the React/Tailwind codebase during **Phase 14 (Integration & Polish)**. 

The current UI provides a perfect stylistic foundation.

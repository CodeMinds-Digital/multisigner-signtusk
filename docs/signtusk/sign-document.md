# Signer Flow – Signing Inbox

## 1. Sign Button (Signer Inbox List)
- When the signer clicks the **Sign** button in the signing inbox list, redirect them to the **PDF Preview screen** (same implementation as the existing Drive document preview).

## 2. Profile Validation
- Before opening the preview, validate that the signer’s profile contains all required details: **Name, Signature, etc.**  
- If any required data is missing, prompt the user to update and save these details in their **Profile Details & Signature settings**.

## 3. PDF Preview Screen
- Inside the preview screen, display **Accept** and **Decline** buttons for the signer.

## 4. Accept Action
- On clicking **Accept**, the system should:
  - Fetch signer details (**Name, Signature, Signing Date/Time**).
  - Apply the **primary signature schema** to the document.
  - Capture and store the **real-time signing location** in the database.
  - Display the captured location in the **Info Popup**.

- Once **all signers** have completed their signatures:
  - Generate the **final signed PDF** using the `pdfme-complete` package `generatePDF` function.
  - Save it in the **Signed bucket** (Supabase Storage).
  - Update the **Signing Request status** to **Completed**.

## 5. Decline Action
- On clicking **Decline**:
  - Display a popup asking the signer to provide a **Reason for Decline**.
  - Update the **Signing Request status** to **Declined** with the reason stored.

## 6. Eye Icon (Preview Final Signed PDF)  
*(Applicable only for Sign Inbox list files, not for Drive documents)*  
- **Before signing:** Show the **parent document preview** (as currently implemented).  
- **After all signers have signed:** The Eye icon should display the **final generated signed PDF** with all signatures.  

- When a signer clicks the **Eye icon**:
  - Show the **final signed PDF** in preview mode.
  - Mark the signing request status as **Completed**.
  - Hide the **Sign button** for that signer.
  - Disable the **Delete option** in the inbox list for the requester.

## 7. Info Popup
- The info popup must display all relevant signer details:
  - **Name**
  - **Signature**
  - **Signing Date/Time**
  - **Signing Location**
  - **Status** (Accepted / Declined with reason)

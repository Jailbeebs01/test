<?php
/**
 * Upload credit note PDF from B2B
 *
 * Uploads a PDF credit note document for the authenticated merchant.
 * The file will be stored on the filesystem and the relative path
 * returned for further processing.
 *
 * @tpg-tag CreditNote
 * @tpg-method POST
 * @tpg-consumes multipart/form-data
 * @tpg-query file file required - Credit note PDF file
 *
 * @tpg-response 200 - Credit note uploaded successfully
 * @tpg-response 400 - Invalid request or file upload error
 * @tpg-response 401 - Unauthorized
 * @tpg-response 500 - Internal server error
 */
public function uploadCreditNoteAction()
{
    $view = Pegasus()->Template();
    $view->setNoRenderer();

    try {
        // Validate merchant authorization
        $merchant = Pegasus()
            ->Container()
            ->get(\Pegasus_Plugins_Components_AuthorizationComponent::class)
            ->checkMerchant();

        if (!$merchant) {
            throw new Exception('Unauthorized', 401);
        }

        // Check if file was uploaded
        if (!isset($_FILES['file']) || UPLOAD_ERR_OK !== $_FILES['file']['error']) {
            throw new Exception('No file provided or upload error', 400);
        }

        $uploadedFile = $_FILES['file'];

        // Validate file is PDF (extension + client-provided MIME type)
        $allowedMimes = [
            'application/pdf',
            'application/x-pdf',
            'application/octet-stream',
        ];

        $isPdfExtension = '.pdf' === substr($uploadedFile['name'], -4);
        $isPdfMime = in_array($uploadedFile['type'], $allowedMimes);

        if (!$isPdfExtension || !$isPdfMime) {
            throw new Exception('File must be PDF with .pdf extension', 400);
        }

        // Create directory for credit notes if it doesn't exist
        $baseDir = Pegasus()->getConfigValue('fs', 'dir');
        $creditNotesDir = $baseDir . 'documents/creditnotes/';

        if (!is_dir($creditNotesDir)) {
            mkdir($creditNotesDir, 0755, true);
        }

        // Generate unique filename with merchant prefix
        $originalName = basename($uploadedFile['name']);
        $timestamp = Carbon::now()->format('YmdHis');
        $uniqueFilename = $merchant['id'] . '_' . $timestamp . '_' . $originalName;
        $targetPath = $creditNotesDir . $uniqueFilename;

        // Move uploaded file to storage
        if (!move_uploaded_file($uploadedFile['tmp_name'], $targetPath)) {
            throw new Exception('Failed to save file', 500);
        }

        // Return relative path for database storage
        $relativePath = 'documents/creditnotes/' . $uniqueFilename;

        http_response_code(200);
        echo json_encode([
            'success'  => true,
            'path'     => $relativePath,
            'filename' => $uniqueFilename,
            'message'  => 'Credit note uploaded successfully',
        ]);
    } catch (Exception $e) {
        http_response_code($e->getCode() ?: 500);
        echo json_encode([
            'error' => $e->getMessage(),
        ]);
    }
}

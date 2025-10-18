package com.example.bearapp;

import android.Manifest;
import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.webkit.MimeTypeMap;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

// Network and I/O imports
import com.example.bearapp.network.BEARApi;
import com.example.bearapp.network.RetrofitClient;
import com.example.bearapp.util.SessionManager;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.Locale;

import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.RequestBody;
import okhttp3.ResponseBody;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class DocumentUploadActivity extends AppCompatActivity {

    private static final String TAG = "DocumentUploadActivity";
    private static final int MAX_DOCUMENTS = 5;
    private static final long MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
    private static final List<String> ALLOWED_MIME_TYPES = Arrays.asList(
            "image/jpeg", "image/png", "application/pdf"
    );
    private static final List<String> IMAGE_MIME_TYPES = Arrays.asList(
            "image/jpeg", "image/png"
    );

    private Spinner spinnerDocumentType;
    private EditText etDocumentDescription;
    private Button btnAddDocument, btnSubmitDocuments;
    private LinearLayout layoutSelectedDocumentsPreview;
    private ProgressBar progressBarUpload;
    private TextView tvSelectedFilesLabel;

    private final List<Uri> selectedDocumentUris = new ArrayList<>();
    private Uri cameraImageUri;

    private ActivityResultLauncher<Intent> cameraLauncher;
    private ActivityResultLauncher<Intent> galleryLauncher;
    private ActivityResultLauncher<String[]> requestPermissionLauncher;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        Log.d(TAG, "LifecycleEvent: onCreate - START");
        super.onCreate(savedInstanceState);
        Log.d(TAG, "LifecycleEvent: onCreate - after super.onCreate");
        setContentView(R.layout.activity_document_upload);
        Log.d(TAG, "LifecycleEvent: onCreate - after setContentView");

        spinnerDocumentType = findViewById(R.id.spinnerDocumentType);
        etDocumentDescription = findViewById(R.id.etDocumentDescription);
        btnAddDocument = findViewById(R.id.btnAddDocument);
        layoutSelectedDocumentsPreview = findViewById(R.id.layoutSelectedDocumentsPreview);
        progressBarUpload = findViewById(R.id.progressBarUpload);
        btnSubmitDocuments = findViewById(R.id.btnSubmitDocuments);
        tvSelectedFilesLabel = findViewById(R.id.tvSelectedFilesLabel);
        Log.d(TAG, "LifecycleEvent: onCreate - after findViewByIds");

        setupDocumentTypeSpinner();
        Log.d(TAG, "LifecycleEvent: onCreate - after setupDocumentTypeSpinner");
        setupResultLaunchers();
        Log.d(TAG, "LifecycleEvent: onCreate - after setupResultLaunchers");
        setupPermissionLauncher();
        Log.d(TAG, "LifecycleEvent: onCreate - after setupPermissionLauncher");

        btnAddDocument.setOnClickListener(v -> showAddDocumentDialog());
        btnSubmitDocuments.setOnClickListener(v -> handleSubmitDocuments());
        Log.d(TAG, "LifecycleEvent: onCreate - after setOnClickListeners");

        updateSelectedFilesLabel();
        Log.d(TAG, "LifecycleEvent: onCreate - END");
    }

    @Override
    protected void onStart() {
        super.onStart();
        Log.d(TAG, "LifecycleEvent: onStart");
    }

    @Override
    protected void onResume() {
        super.onResume();
        Log.d(TAG, "LifecycleEvent: onResume");
    }

    @Override
    protected void onPause() {
        super.onPause();
        Log.d(TAG, "LifecycleEvent: onPause");
    }

    @Override
    protected void onStop() {
        super.onStop();
        Log.d(TAG, "LifecycleEvent: onStop");
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "LifecycleEvent: onDestroy");
    }

    private void setupPermissionLauncher() {
        requestPermissionLauncher = registerForActivityResult(
                new ActivityResultContracts.RequestMultiplePermissions(),
                permissions -> {
                    boolean cameraGranted = permissions.getOrDefault(Manifest.permission.CAMERA, false);
                    String storagePermission = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU ?
                            Manifest.permission.READ_MEDIA_IMAGES : Manifest.permission.READ_EXTERNAL_STORAGE;
                    boolean storageGranted = permissions.getOrDefault(storagePermission, false);

                    if (cameraGranted && storageGranted) {
                        Log.d(TAG, "Camera and Storage permissions granted.");
                    } else if (cameraGranted) {
                        Log.w(TAG, "Storage permission was denied.");
                        Toast.makeText(this, "Storage permission is needed to select files.", Toast.LENGTH_LONG).show();
                    } else if (storageGranted) {
                        Log.w(TAG, "Camera permission was denied.");
                        Toast.makeText(this, "Camera permission is needed to take photos.", Toast.LENGTH_LONG).show();
                    } else {
                        Log.w(TAG, "Camera and Storage permissions were denied.");
                        Toast.makeText(this, "Camera and Storage permissions are required.", Toast.LENGTH_LONG).show();
                    }
                });
    }

    private void setupResultLaunchers() {
        cameraLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    if (result.getResultCode() == Activity.RESULT_OK) {
                        if (cameraImageUri != null) {
                            addSelectedFile(cameraImageUri);
                            cameraImageUri = null;
                        } else {
                            Toast.makeText(this, "Failed to get image from camera.", Toast.LENGTH_SHORT).show();
                        }
                    }
                });

        galleryLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
                        Uri selectedUri = result.getData().getData();
                        if (selectedUri != null) {
                            addSelectedFile(selectedUri);
                        } else {
                            Toast.makeText(this, "Failed to get document from gallery.", Toast.LENGTH_SHORT).show();
                        }
                    }
                });
    }

    private void setupDocumentTypeSpinner() {
        List<String> documentTypes = new ArrayList<>(Arrays.asList(
                "barangay_id", "utility_bill", "voter_id",
                "employment_cert", "authorization_letter", "other"
        ));
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this,
                android.R.layout.simple_spinner_item, documentTypes);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerDocumentType.setAdapter(adapter);
    }

    private void showAddDocumentDialog() {
        if (selectedDocumentUris.size() >= MAX_DOCUMENTS) {
            Toast.makeText(this, "You can select a maximum of " + MAX_DOCUMENTS + " documents.", Toast.LENGTH_SHORT).show();
            return;
        }
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Add Document");
        builder.setItems(new CharSequence[]{"Take Photo (Camera)", "Choose from Gallery"},
                (dialog, which) -> {
                    if (which == 0) {
                        checkAndOpenCamera();
                    } else {
                        checkAndOpenGallery();
                    }
                });
        builder.show();
    }

    private void checkAndOpenCamera() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            requestPermissionsIfNeeded(new String[]{Manifest.permission.CAMERA});
        } else {
            openCamera();
        }
    }

    private void openCamera() {
        Intent takePictureIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        File photoFile = null;
        try {
            photoFile = createImageFile("CAMERA_");
        } catch (IOException ex) {
            Log.e(TAG, "Error creating image file: " + ex.getMessage());
            Toast.makeText(this, "Error preparing camera.", Toast.LENGTH_SHORT).show();
            return;
        }

        if (photoFile != null) {
            cameraImageUri = FileProvider.getUriForFile(this,
                    BuildConfig.APPLICATION_ID + ".provider",
                    photoFile);
            takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraImageUri);
            try {
                cameraLauncher.launch(takePictureIntent);
            } catch (Exception e) {
                Log.e(TAG, "Failed to launch camera: " + e.getMessage());
                Toast.makeText(this, "Could not open camera.", Toast.LENGTH_SHORT).show();
            }
        }
    }
    private File createImageFile(String prefix) throws IOException {
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
        String imageFileName = prefix + timeStamp + "_";
        File storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
        if (prefix.equals("COMPRESSED_")) {
            storageDir = getCacheDir();
        }
        if (storageDir != null && !storageDir.exists()) {
            storageDir.mkdirs();
        }
        File image = File.createTempFile(imageFileName, ".jpg", storageDir);
        return image;
    }


    private void checkAndOpenGallery() {
        String storagePermission = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU ?
                Manifest.permission.READ_MEDIA_IMAGES : Manifest.permission.READ_EXTERNAL_STORAGE;
        if (ContextCompat.checkSelfPermission(this, storagePermission) != PackageManager.PERMISSION_GRANTED) {
            requestPermissionsIfNeeded(new String[]{storagePermission});
        } else {
            openGallery();
        }
    }

    private void openGallery() {
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        String[] mimeTypes = ALLOWED_MIME_TYPES.toArray(new String[0]);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            intent.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes);
        } else {
            intent.setType("*/*");
        }
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        try {
            galleryLauncher.launch(Intent.createChooser(intent, "Select Document"));
        } catch (Exception e) {
            Log.e(TAG, "Failed to launch gallery: " + e.getMessage());
            Toast.makeText(this, "Could not open gallery.", Toast.LENGTH_SHORT).show();
        }
    }

    private void requestPermissionsIfNeeded(String[] permissions) {
        List<String> permissionsToRequest = new ArrayList<>();
        for (String permission : permissions) {
            if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(permission);
            }
        }
        if (!permissionsToRequest.isEmpty()) {
            requestPermissionLauncher.launch(permissionsToRequest.toArray(new String[0]));
        } else {
            if (Arrays.asList(permissions).contains(Manifest.permission.CAMERA)) openCamera();
            else if (Arrays.asList(permissions).contains(Manifest.permission.READ_MEDIA_IMAGES) ||
                    Arrays.asList(permissions).contains(Manifest.permission.READ_EXTERNAL_STORAGE))
                openGallery();
        }
    }

    private void addSelectedFile(Uri uri) {
        if (selectedDocumentUris.size() >= MAX_DOCUMENTS) {
            Toast.makeText(this, "Maximum " + MAX_DOCUMENTS + " documents allowed.", Toast.LENGTH_SHORT).show();
            return;
        }

        String mimeType = getMimeType(uri);
        if (mimeType == null || !ALLOWED_MIME_TYPES.contains(mimeType.toLowerCase())) {
            Toast.makeText(this, "Invalid file type. Please select JPG, PNG, or PDF.", Toast.LENGTH_LONG).show();
            return;
        }

        long fileSize = getFileSize(uri);
        if (fileSize == -1) {
            Toast.makeText(this, "Could not determine file size.", Toast.LENGTH_SHORT).show();
            return;
        }
        if (fileSize > MAX_FILE_SIZE_BYTES) {
            Toast.makeText(this, "File is too large (Max " + (MAX_FILE_SIZE_BYTES / (1024 * 1024)) + "MB).", Toast.LENGTH_LONG).show();
            return;
        }

        Uri finalUriToUse = uri;
        if (IMAGE_MIME_TYPES.contains(mimeType.toLowerCase())) {
            finalUriToUse = compressImageIfNecessary(uri, mimeType);
        }

        selectedDocumentUris.add(finalUriToUse);
        updateSelectedFilesLabel();
        addPreviewToLayout(finalUriToUse);
    }

    private Uri compressImageIfNecessary(Uri originalImageUri, String mimeType) {
        Log.d(TAG, "compressImageIfNecessary called for: " + originalImageUri);
        // TODO: Implement asynchronous image compression
        Toast.makeText(this, "Image compression placeholder for: " + getFileName(originalImageUri), Toast.LENGTH_SHORT).show();
        return originalImageUri;
    }

    private long getFileSize(Uri uri) {
        if (ContentResolver.SCHEME_CONTENT.equals(uri.getScheme())) {
            try (Cursor cursor = getContentResolver().query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE);
                    if (sizeIndex != -1 && !cursor.isNull(sizeIndex)) {
                        return cursor.getLong(sizeIndex);
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Error getting file size for content URI: " + e.getMessage());
            }
        } else if (ContentResolver.SCHEME_FILE.equals(uri.getScheme())) {
            String path = uri.getPath();
            if (path != null) {
                File file = new File(path);
                if (file.exists()) {
                    return file.length();
                }
            }
        }
        return -1;
    }


    private void updateSelectedFilesLabel() {
        tvSelectedFilesLabel.setText("Selected Files (" + selectedDocumentUris.size() + "/" + MAX_DOCUMENTS + "):");
        btnSubmitDocuments.setEnabled(!selectedDocumentUris.isEmpty());
    }

    private void addPreviewToLayout(final Uri uri) {
        LayoutInflater inflater = LayoutInflater.from(this);
        View previewItemView = inflater.inflate(R.layout.item_document_preview, layoutSelectedDocumentsPreview, false);

        ImageView ivDocumentPreview = previewItemView.findViewById(R.id.ivDocumentPreview);
        TextView tvDocumentNamePreview = previewItemView.findViewById(R.id.tvDocumentNamePreview);
        Button btnRemoveDocumentPreview = previewItemView.findViewById(R.id.btnRemoveDocumentPreview);

        String fileName = getFileName(uri);
        tvDocumentNamePreview.setText(fileName);

        String mimeType = getMimeType(uri);
        if (mimeType != null) {
            if (mimeType.startsWith("image/")) {
                ivDocumentPreview.setImageURI(uri);
            } else if (mimeType.equals("application/pdf")) {
                ivDocumentPreview.setImageResource(R.drawable.ic_file_pdf);
            } else {
                ivDocumentPreview.setImageResource(R.drawable.ic_file_generic);
            }
        } else {
            ivDocumentPreview.setImageResource(R.drawable.ic_file_generic);
        }

        btnRemoveDocumentPreview.setOnClickListener(v -> {
            selectedDocumentUris.remove(uri);
            layoutSelectedDocumentsPreview.removeView(previewItemView);
            updateSelectedFilesLabel();
        });
        layoutSelectedDocumentsPreview.addView(previewItemView);
    }

    public String getFileName(Uri uri) {
        String result = null;
        if (uri.getScheme().equals("content")) {
            try (Cursor cursor = getContentResolver().query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (nameIndex != -1) {
                         result = cursor.getString(nameIndex);
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Error getting file name from content URI: " + e.getMessage());
            }
        }
        if (result == null) {
            result = uri.getPath();
            if (result != null) {
                int cut = result.lastIndexOf('/');
                if (cut != -1) {
                    result = result.substring(cut + 1);
                }
            }
        }
        return result != null ? result : "Unknown_File";
    }
    public String getMimeType(Uri uri) {
        String mimeType = null;
        if (ContentResolver.SCHEME_CONTENT.equals(uri.getScheme())) {
            mimeType = getContentResolver().getType(uri);
        } else {
            String fileExtension = MimeTypeMap.getFileExtensionFromUrl(uri.toString());
            if (fileExtension != null) {
                mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(fileExtension.toLowerCase());
            }
        }
        return mimeType;
    }

    private byte[] readInputStreamToBytes(InputStream inputStream) throws IOException {
        ByteArrayOutputStream byteBuffer = new ByteArrayOutputStream();
        int bufferSize = 1024;
        byte[] buffer = new byte[bufferSize];
        int len;
        while ((len = inputStream.read(buffer)) != -1) {
            byteBuffer.write(buffer, 0, len);
        }
        return byteBuffer.toByteArray();
    }

    private void handleSubmitDocuments() {
        if (selectedDocumentUris.isEmpty()) {
            Toast.makeText(this, "Please select at least one document.", Toast.LENGTH_SHORT).show();
            return;
        }

        progressBarUpload.setVisibility(View.VISIBLE);
        progressBarUpload.setIndeterminate(true);
        btnSubmitDocuments.setEnabled(false);

        String docTypeString = spinnerDocumentType.getSelectedItem().toString();
        String descriptionString = etDocumentDescription.getText().toString().trim();

        RequestBody documentTypePart = RequestBody.create(MediaType.parse("text/plain"), docTypeString);
        RequestBody descriptionPart = RequestBody.create(MediaType.parse("text/plain"), descriptionString);

        List<MultipartBody.Part> documentFileParts = new ArrayList<>();
        for (Uri fileUri : selectedDocumentUris) {
            try {
                String fileName = getFileName(fileUri);
                String mimeType = getMimeType(fileUri);
                if (mimeType == null) {
                    Log.w(TAG, "Could not determine MIME type for " + fileName + ". Skipping.");
                    continue;
                }

                InputStream inputStream = getContentResolver().openInputStream(fileUri);
                if (inputStream == null) {
                    Log.w(TAG, "Could not open InputStream for " + fileName + ". Skipping.");
                    continue;
                }
                byte[] fileBytes = readInputStreamToBytes(inputStream);
                inputStream.close();

                RequestBody requestFile = RequestBody.create(MediaType.parse(mimeType), fileBytes);
                MultipartBody.Part body = MultipartBody.Part.createFormData("documents", fileName, requestFile);
                documentFileParts.add(body);

            } catch (IOException e) {
                Log.e(TAG, "Error preparing file for upload: " + fileUri.toString(), e);
                Toast.makeText(this, "Error preparing file: " + getFileName(fileUri), Toast.LENGTH_SHORT).show();
                progressBarUpload.setVisibility(View.GONE);
                btnSubmitDocuments.setEnabled(true);
                return;
            }
        }

        if (documentFileParts.isEmpty() && !selectedDocumentUris.isEmpty()) {
             Toast.makeText(this, "No valid files could be prepared for upload.", Toast.LENGTH_LONG).show();
             progressBarUpload.setVisibility(View.GONE);
             btnSubmitDocuments.setEnabled(true);
             return;
        }


        String authToken = new SessionManager(this).getAuthToken();
        if (authToken == null || authToken.isEmpty()) {
            Toast.makeText(this, "Authentication error. Please log in again.", Toast.LENGTH_LONG).show();
            progressBarUpload.setVisibility(View.GONE);
            btnSubmitDocuments.setEnabled(true);
            // TODO: Navigate to login
            return;
        }
        String bearerAuthToken = "Bearer " + authToken;


        BEARApi apiService = RetrofitClient.getClient(this).create(BEARApi.class);
        // Calling the main upload-documents endpoint
        Log.d(TAG, "Calling /api/verification/upload-documents");
        Call<ResponseBody> call = apiService.uploadVerificationDocuments(bearerAuthToken, documentFileParts, documentTypePart, descriptionPart);

        call.enqueue(new Callback<ResponseBody>() {
            @Override
            public void onResponse(Call<ResponseBody> call, Response<ResponseBody> response) {
                progressBarUpload.setVisibility(View.GONE);
                btnSubmitDocuments.setEnabled(true);
                if (response.isSuccessful()) {
                    Toast.makeText(DocumentUploadActivity.this, "Documents uploaded successfully! Moving to status page.", Toast.LENGTH_LONG).show();
                    Log.d(TAG, "Upload successful: " + response.message());
                    if (response.body() != null) {
                        try {
                            // Log the response body if needed for debugging, but be cautious with large responses
                            // Log.d(TAG, "Upload Response Body: " + response.body().string());
                        } catch (Exception e) { // Changed from IOException to Exception for broader catch if string() itself fails for other reasons
                            Log.e(TAG, "Error reading upload response body", e);
                        }
                    }
                    // Navigate to VerificationStatusActivity
                    Intent intent = new Intent(DocumentUploadActivity.this, VerificationStatusActivity.class);
                    startActivity(intent);
                    finish(); // Close DocumentUploadActivity

                } else {
                    String errorMessage = "Upload failed: ";
                    try {
                        if (response.errorBody() != null) {
                            errorMessage += response.errorBody().string();
                        } else {
                            errorMessage += response.code() + " " + response.message();
                        }
                    } catch (IOException e) {
                        errorMessage += "Error reading error response.";
                    }
                    Toast.makeText(DocumentUploadActivity.this, errorMessage, Toast.LENGTH_LONG).show();
                    Log.e(TAG, "Upload error: " + errorMessage);
                }
            }

            @Override
            public void onFailure(Call<ResponseBody> call, Throwable t) {
                progressBarUpload.setVisibility(View.GONE);
                btnSubmitDocuments.setEnabled(true);
                Log.e(TAG, "Upload failure: " + t.getMessage(), t);
                Toast.makeText(DocumentUploadActivity.this, "Upload failed: " + t.getMessage(), Toast.LENGTH_LONG).show();
            }
        });
    }
}

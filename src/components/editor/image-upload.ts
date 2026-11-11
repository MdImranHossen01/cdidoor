import { createImageUpload } from "novel";
import { toast } from "sonner";
import { uploadImageToR2 } from "@/lib/upload";

const onUpload = (file: File) => {
    const promise = uploadImageToR2(file, { folder: 'editor' });

    return new Promise((resolve, reject) => {
        toast.promise(
            promise.then((url) => {
                const image = new Image();
                image.src = url;
                image.onload = () => {
                    resolve(url);
                };
                return url;
            }),
            {
                loading: "Uploading image...",
                success: "Image uploaded successfully.",
                error: (e) => {
                    reject(e);
                    return e.message || "Error uploading image. Please try again.";
                },
            },
        );
    });
};

export const uploadFn = createImageUpload({
    onUpload,
    validateFn: (file) => {
        if (!file.type.includes("image/")) {
            toast.error("File type not supported. Please upload an image.");
            return false;
        }
        if (file.size > 1 * 1024 * 1024) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            toast.error(`Image size cannot exceed 1 MB! Your file is ${sizeMB} MB.`);
            return false;
        }
        return true;
    },
});

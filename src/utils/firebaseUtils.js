import { storage } from '../firebase';
import { ref, getDownloadURL } from 'firebase/storage';

/**
 * Generate a fresh download URL for a Firebase Storage file
 * @param {string} token - User token
 * @param {string} firstName - User first name
 * @param {string} lastName - User last name
 * @param {string} type - 'face' or 'doc'
 * @returns {Promise<string>} Fresh download URL
 */
export const getDynamicPhotoUrl = async (token, firstName, lastName, type = 'face') => {
    try {
        const fileName = `images/${token}_${firstName}_${lastName}_${type}.jpg`;
        const storageRef = ref(storage, fileName);
        const downloadUrl = await getDownloadURL(storageRef);
        return downloadUrl;
    } catch (error) {
        console.error(`Error getting ${type} photo URL:`, error);
        return null;
    }
};

/**
 * Generate a fresh download URL for face photo
 * @param {string} token - User token
 * @param {string} firstName - User first name
 * @param {string} lastName - User last name
 * @returns {Promise<string>} Fresh face photo URL
 */
export const getDynamicFacePhotoUrl = (token, firstName, lastName) => {
    return getDynamicPhotoUrl(token, firstName, lastName, 'face');
};

/**
 * Generate a fresh download URL for document photo
 * @param {string} token - User token
 * @param {string} firstName - User first name
 * @param {string} lastName - User last name
 * @returns {Promise<string>} Fresh document photo URL
 */
export const getDynamicDocPhotoUrl = (token, firstName, lastName) => {
    return getDynamicPhotoUrl(token, firstName, lastName, 'doc');
};

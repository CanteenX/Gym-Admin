/**
 * Blogs API Service
 * Handles all Blog Category, Blog Tag, and Blog Master API calls
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

// ============ BLOG CATEGORY OPERATIONS ============
export const createBlogCategory = async (data) => {
    return api.post(ENDPOINTS.BLOG_CATEGORIES.BASE, data);
};

export const getBlogCategoryById = async (id) => {
    return api.get(ENDPOINTS.BLOG_CATEGORIES.BY_ID(id));
};

export const updateBlogCategory = async (id, data) => {
    return api.put(ENDPOINTS.BLOG_CATEGORIES.BY_ID(id), data);
};

export const deleteBlogCategory = async (id) => {
    return api.delete(ENDPOINTS.BLOG_CATEGORIES.BY_ID(id));
};

export const listAllBlogCategories = async () => {
    return api.get(ENDPOINTS.BLOG_CATEGORIES.LIST_ALL);
};

export const searchBlogCategories = async (params) => {
    return api.post(ENDPOINTS.BLOG_CATEGORIES.SEARCH, params);
};

// ============ BLOG TAG OPERATIONS ============
export const createBlogTag = async (data) => {
    return api.post(ENDPOINTS.BLOG_TAGS.BASE, data);
};

export const updateBlogTag = async (id, data) => {
    return api.put(ENDPOINTS.BLOG_TAGS.BY_ID(id), data);
};

export const deleteBlogTag = async (id) => {
    return api.delete(ENDPOINTS.BLOG_TAGS.BY_ID(id));
};

export const listAllBlogTags = async () => {
    return api.get(ENDPOINTS.BLOG_TAGS.LIST_ALL);
};

export const searchBlogTags = async (params) => {
    return api.post(ENDPOINTS.BLOG_TAGS.SEARCH, params);
};

// ============ BLOG MASTER OPERATIONS ============
export const createBlog = async (formData) => {
    return api.post(ENDPOINTS.BLOGS.BASE, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

export const getBlogById = async (id) => {
    return api.get(ENDPOINTS.BLOGS.BY_ID(id));
};

export const updateBlog = async (id, formData) => {
    return api.put(ENDPOINTS.BLOGS.BY_ID(id), formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

export const deleteBlog = async (id) => {
    return api.delete(ENDPOINTS.BLOGS.BY_ID(id));
};

export const toggleBlogStatus = async (id, data) => {
    return api.patch(ENDPOINTS.BLOGS.STATUS(id), data);
};

export const searchBlogs = async (params) => {
    return api.post(ENDPOINTS.BLOGS.SEARCH, params);
};

export const getBlogStats = async () => {
    return api.get(ENDPOINTS.BLOGS.STATS);
};

export default {
    createBlogCategory,
    getBlogCategoryById,
    updateBlogCategory,
    deleteBlogCategory,
    listAllBlogCategories,
    searchBlogCategories,
    createBlogTag,
    updateBlogTag,
    deleteBlogTag,
    listAllBlogTags,
    searchBlogTags,
    createBlog,
    getBlogById,
    updateBlog,
    deleteBlog,
    toggleBlogStatus,
    searchBlogs,
    getBlogStats,
};

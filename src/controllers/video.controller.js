import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    console.log(query);
    //TODO: get all videos based on query, sort, pagination

    const video = await Video.aggregate([
        {
            $match: {
                $or: [
                    { title: { $regex: query, $options: 'i' } },
                    { description: { $regex: query, $options: 'i' } }
                ]
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "createdBy"
            },
        },
        {
            $unwind: "$createdBy"
        },
        {
            $project: {
                thumbnail: 1,
                videoFile: 1,
                title: 1,
                description: 1,
                duration: 1,
                createdBy: {
                    fullName: 1,
                    username: 1,
                    avatar: 1
                }
            }
        }
        ,
        {
            $sort: {
                [sortBy]: sortType === "asc" ? 1 : -1
            }
        },
        {
            $skip: (page - 1) * limit
        },
        {
            $limit: parseInt(limit)
        },
    ])

    return res.status(200).json(new ApiResponse(
        200,
        "Videos fetched successfully",
        video
    ))

})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    // TODO: get video, upload to cloudinary, create video
    if (!title || !description) {
        throw new ApiError(400, "Title and description are required")
    }
    const videoFileLocalPath = req.files?.videoFile[0]?.path

    if (!videoFileLocalPath) {
        throw new ApiError(400, "Video is required")
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath)
    if (!videoFile.url) {
        throw new ApiError(400, "Video upload failed")
    }
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required")
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if (!thumbnail.url) {
        throw new ApiError(400, "Thumbnail upload failed")
    }
    const video = await Video.create({
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        title,
        description,
        duration: videoFile.duration,
        owner: req.user._id
    })

    if (!video) {
        throw new ApiError(400, "Video creation failed")
    }

    return res.status(201).json(new ApiResponse(
        201,
        "Video created successfully",
        video
    ))

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }
    console.log(videoId);
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
    return res.status(200).json(new ApiResponse(
        200,
        "Video fetched successfully",
        video
    ))

})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }
    const { title, description } = req.body
    if (!title || !description) {
        throw new ApiError(400, "Title and description are required")
    }

    const newThumbnailLocalPath = req.file?.path;
    if (!newThumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required")
    }
    console.log("req.user:", req.user);
    const video = await Video.findById(videoId)
    console.log("video.owner:", video.owner);
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this video");
    }


    const deleteThumbnailResponse = await deleteFromCloudinary(video.thumbnail)
    if (!deleteThumbnailResponse) {
        throw new ApiError(400, "Thumbnail deletion failed")
    }

    const newThumbnail = await uploadOnCloudinary(newThumbnailLocalPath)
    if (!newThumbnail.url) {
        throw new ApiError(400, "Thumbnail upload failed")
    }

    const updateVideo = await Video.findByIdAndUpdate(videoId, {
        title,
        description,
        thumbnail: newThumbnail.url
    }, {
        new: true
    })

    if (!updateVideo) {
        throw new ApiError(400, "Video update failed")
    }

    return res.status(200).json(new ApiResponse(
        200,
        "Video updated successfully",
        updateVideo
    ))
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this video");
    }

    const deleteVideoResponse = await deleteFromCloudinary(video.videoFile)
    if (!deleteVideoResponse) {
        throw new ApiError(400, "Video deletion failed")
    }

    const deleteThumbnailResponse = await deleteFromCloudinary(video.thumbnail)
    if (!deleteThumbnailResponse) {
        throw new ApiError(400, "Thumbnail deletion failed")
    }

    const deleteVideo = await Video.findByIdAndDelete(videoId)
    if (!deleteVideo) {
        throw new ApiError(400, "Video deletion failed")
    }

    return res.status(200).json(new ApiResponse(
        200,
        "Video deleted successfully",
        deleteVideo
    ))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this video");
    }

    const updateVideo = await Video.findByIdAndUpdate(videoId, {
        $set: {
            isPublished: !video.isPublished
        }
    }, {
        new: true
    })

    if (!updateVideo) {
        throw new ApiError(400, "Video update failed")
    }

    return res.status(200).json(new ApiResponse(
        200,
        "Video updated successfully",
        updateVideo
    ))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}

import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"
import { parse } from "dotenv"
import mongoose, { isValidObjectId } from "mongoose"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
    const comment = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "createdBy",
                pipeline: [
                    {
                        $project: {
                            avatar: 1,
                            username: 1,
                            fullName: 1
                        }
                    }
                ]
            }
        }, {
            $addFields: {
                createdBy: {
                    $first: "$createdBy"
                }
            }
        }, {
            $unwind: "$createdBy"
        }, {
            $project: {
                video: 1,
                createdBy: 1
            }
        },
        {
            $skip: (page - 1) * limit
        },
        {
            $limit: parseInt(limit),
        }
    ])

    if (!comment) {
        throw new ApiError(404, "Comments not found")
    }

    return res.status(200).json(new ApiResponse(
        200,
        comment,
        "Comments fetched successfully",
    ))

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { videoId } = req.params
    const { content } = req.body
    if (!content) {
        throw new ApiError(400, "Content is required")
    }

    const addComment = await Comment.create({
        content,
        video: videoId,
        owner: req.user._id
    })

    if (!addComment) {
        throw new ApiError(400, "Comment creation failed")
    }

    return res.status(201).json(new ApiResponse(
        201,
        addComment,
        "Comment created successfully",
    ))
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { commentId } = req.params
    const { content } = req.body
    if (!content) {
        throw new ApiError(400, "Content is required")
    }

    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }
    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this comment");
    }
    const updateComment = await Comment.findByIdAndUpdate(commentId, {
        $set: {
            content
        }
    }, {
        new: true
    })

    if (!updateComment) {
        throw new ApiError(400, "Comment update failed")
    }

    return res.status(200).json(new ApiResponse(
        200,
        updateComment,
        "Comment updated successfully",
    ))
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }
    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }
    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this comment");
    }
    const deletedComment = await Comment.findByIdAndDelete(commentId)
    if (!deletedComment) {
        throw new ApiError(400, "Comment delete failed")
    }
    return res.status(200).json(new ApiResponse(
        200,
        deletedComment,
        "Comment deleted successfully",
    ))
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}

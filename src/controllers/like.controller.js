import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    // Validate the videoId
    if (!isValidObjectId(videoId)) {
        return res.status(400).json({ message: "Invalid video id" });
    }

    const user = req.user._id;

    // Try to find the like entry for this video by the user
    const likedVideo = await Like.findOne({
        video: videoId,
        likedBy: user
    });

    if (likedVideo) {
        // If the user has liked the video, we will unlike it by deleting the like
        const unLikeVideo = await Like.findByIdAndDelete(likedVideo._id);

        if (!unLikeVideo) {
            return res.status(400).json({ message: "Failed to unlike the video" });
        }

        return res.status(200).json({ message: "Video unliked successfully", data: unLikeVideo });
    }

    // If the user has not liked the video yet, create a new like
    const like = await Like.create({
        video: videoId,
        likedBy: user
    });

    if (!like) {
        return res.status(400).json({ message: "Failed to like the video" });
    }

    return res.status(200).json({ message: "Video liked successfully", data: like });
});


const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    //TODO: toggle like on comment
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }

    const user = req.user._id

    // Try to find the like entry for this comment by the user
    const likedComment = await Like.findOne({
        comment: commentId,
        likedBy: user
    })

    if (likedComment) {
        // If the user has liked the comment, we will unlike it by deleting the like
        const unLikeComment = await Like.findByIdAndDelete(likedComment._id)

        if (!unLikeComment) {
            throw new ApiError(400, "Failed to unlike the comment")
        }

        return res.status(200).json(new ApiResponse(
            200,
            "Comment unliked successfully",
            unLikeComment
        ))
    }

    // If the user has not liked the comment yet, create a new like
    const like = await Like.create({
        comment: commentId,
        likedBy: user
    })

    if (!like) {
        throw new ApiError(400, "Failed to like the comment")
    }

    return res.status(200).json(new ApiResponse(
        200,
        "Comment liked successfully",
        like
    ))

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    //TODO: toggle like on tweet
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id")
    }

    const user = req.user._id

    // Try to find the like entry for this tweet by the user
    const likedTweet = await Like.findOne({
        tweet: tweetId,
        likedBy: user
    })

    if (likedTweet) {
        // If the user has liked the tweet, we will unlike it by deleting the like
        const unLikeTweet = await Like.findByIdAndDelete(likedTweet._id)

        if (!unLikeTweet) {
            throw new ApiError(400, "Failed to unlike the tweet")
        }

        return res.status(200).json(new ApiResponse(
            200,
            "Tweet unliked successfully",
            unLikeTweet
        ))
    }

    const createTeetLike = await Like.create({
        tweet: tweetId,
        likedBy: user
    })

    if (!createTeetLike) {
        throw new ApiError(400, "Failed to like the tweet")
    }

    return res.status(200).json(new ApiResponse(
        200,
        "Tweet liked successfully",
        createTeetLike
    ))
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query; // Default pagination to page 1, limit 10

        const likedVideos = await Like.aggregate([
            {
                $match: {
                    likedBy: new mongoose.Types.ObjectId(req.user._id),
                    video: { $exists: true, $ne: null },
                },
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "video",
                    foreignField: "_id",
                    as: "video",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "owner",
                                foreignField: "_id",
                                as: "owner",
                                pipeline: [
                                    {
                                        $project: {
                                            avatar: 1,
                                            username: 1,
                                            fullName: 1,
                                        },
                                    },
                                ],
                            },
                        },
                        {
                            $addFields: {
                                owner: { $first: "$owner" },
                            },
                        },
                        {
                            $project: {
                                videoFile: 1,
                                thumbnail: 1,
                                title: 1,
                                duration: 1,
                                views: 1,
                                owner: 1,
                            },
                        },
                    ],
                },
            },
            {
                $unwind: "$video",
            },
            {
                $project: {
                    video: 1,
                    likedBy: 1,
                },
            },
            {
                $skip: (page - 1) * limit, // Skips the documents based on page number
            },
            {
                $limit: limit, // Limits the number of documents returned
            },
        ]);

        // Return the response with the formatted result
        return res.status(200).json(new ApiResponse(200, likedVideos, "Fetched Liked Videos"));
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
});

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}
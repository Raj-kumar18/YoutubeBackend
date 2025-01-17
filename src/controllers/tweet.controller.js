import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const { content } = req.body
    if (!content) {
        throw new ApiError(400, "Content is required")
    }

    const tweet = await Tweet.create({
        content,
        owner: req.user._id
    })

    if (!tweet) {
        throw new ApiError(400, "Tweet creation failed")
    }

    return res.status(201).json(new ApiResponse(
        201,
        "Tweet created successfully",
        tweet
    ))
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const { userId } = req.params
    console.log(userId);
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id")
    }

    const user = await User.findById(userId)
    if (!user) {
        throw new ApiError(404, "User not found")
    }
    const getUserTweets = await Tweet.find({ owner: userId })
    if (!getUserTweets) {
        throw new ApiError(404, "User tweets not found")
    }
    return res.status(200).json(new ApiResponse(
        200,
        getUserTweets,
        "User tweets fetched successfully",
    ))
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const { tweetId } = req.params
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id")
    }
    const { content } = req.body
    if (!content) {
        throw new ApiError(400, "Content is required")
    }

    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }
    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this tweet");
    }
    const updateTweet = await Tweet.findByIdAndUpdate(tweetId, {
        $set: {
            content
        }
    }, {
        new: true
    })

    if (!updateTweet) {
        throw new ApiError(400, "Tweet update failed")
    }

    return res.status(200).json(new ApiResponse(
        200,
        "Tweet updated successfully",
        updateTweet
    ))

})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId } = req.params
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id")
    }

    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }

    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this tweet");
    }

    const deleteTweet = await Tweet.findByIdAndDelete(tweetId)
    if (!deleteTweet) {
        throw new ApiError(400, "Tweet deletion failed")
    }

    return res.status(200).json(new ApiResponse(
        200,
        "Tweet deleted successfully",
        deleteTweet
    ))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}

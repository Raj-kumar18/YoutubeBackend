import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body

    //TODO: create playlist
    if (!name || !description) {
        throw new ApiError(400, "Name and description are required")
    }

    const existingPlaylist = await Playlist.findOne({
        $and: [
            { name },
            { owner: req.user._id }
        ]
    })

    if (existingPlaylist) {
        throw new ApiError(400, "Playlist already exists")
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user._id
    })

    if (!playlist) {
        throw new ApiError(400, "Playlist creation failed")
    }

    return res.status(201).json(new ApiResponse(
        201,
        "Playlist created successfully",
        playlist
    ))
})
const getUserPlaylists = asyncHandler(async (req, res) => {
    // User ID ko request parameters se le rahe hain
    const { userId } = req.params;

    // Check kar rahe hain ki userId valid MongoDB ObjectId hai ya nahi
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid User ID");  // Agar invalid hai toh error throw karenge
    }

    // Playlist ko MongoDB aggregation pipeline se fetch kar rahe hain
    const userPlaylists = await Playlist.aggregate([
        // Step 1: Match karte hain ki playlist ka owner kis user ka hai
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),  // userId ke saath match karo
            },
        },
        // Step 2: Playlist ke videos ko join kar rahe hain "videos" collection se
        {
            $lookup: {
                from: "videos",  // Videos collection se data le rahe hain
                localField: "videos",  // Playlist ke videos IDs ko match kar rahe hain
                foreignField: "_id",  // Videos collection ke _id se
                as: "videos",  // Result ko "videos" ke naam se store karenge
                pipeline: [
                    // Nested lookup: Video ke owner ka data le rahe hain "users" collection se
                    {
                        $lookup: {
                            from: "users",  // Users collection se join kar rahe hain
                            localField: "owner",  // Video ke owner ko match kar rahe hain
                            foreignField: "_id",  // Users collection ke _id se
                            as: "owner",  // Result ko "owner" ke naam se store karenge
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,  // Full name
                                        username: 1,  // Username
                                        avatar: 1,  // Avatar image
                                    },
                                },
                            ],
                        },
                    },
                    // Video owner ka data first entry mein add kar rahe hain
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner",  // Sabse pehla owner ka data rakh rahe hain
                            },
                        },
                    },
                    // Final video fields select kar rahe hain (title, thumbnail, description, owner)
                    {
                        $project: {
                            title: 1,
                            thumbnail: 1,
                            description: 1,
                            owner: 1,
                        },
                    },
                ],
            },
        },
        // Step 3: Playlist ke owner ka data le rahe hain "users" collection se
        {
            $lookup: {
                from: "users",  // Users collection se join kar rahe hain
                localField: "owner",  // Playlist ke owner ko match kar rahe hain
                foreignField: "_id",  // Users collection ke _id se
                as: "createdBy",  // Result ko "createdBy" ke naam se store karenge
                pipeline: [
                    {
                        $project: {
                            avatar: 1,  // Avatar image
                            fullName: 1,  // Full name
                            username: 1,  // Username
                        },
                    },
                ],
            },
        },
        // Playlist ke creator ka data first entry mein add kar rahe hain
        {
            $addFields: {
                createdBy: {
                    $first: "$createdBy",  // Sabse pehla creator ka data rakh rahe hain
                },
            },
        },
        // Final fields ko select kar rahe hain: videos, createdBy, name, description
        {
            $project: {
                videos: 1,
                createdBy: 1,
                name: 1,
                description: 1,
            },
        },
    ])

    // Agar koi playlists nahi milti hain
    if (userPlaylists.length === 0) {
        throw new ApiError(504, "No Playlists found");  // 504 error ke saath message bhejenge
    }

    // Agar playlists mil gayi toh response send kar rahe hain
    return res
        .status(200)
        .json(new ApiResponse(200, userPlaylists, "Playlists Fetched"));
});


const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    //TODO: get playlist by id
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id")
    }

    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    return res.status(200).json(new ApiResponse(
        200,
        "Playlist fetched successfully",
        playlist
    ))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist or video id");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Check if the video is already in the playlist
    if (playlist.videos.includes(videoId)) {
        return res.status(200).json(new ApiResponse(
            200,
            "Video is already in the playlist",
            playlist
        ));
    }

    const updatePlayList = await Playlist.findByIdAndUpdate(playlistId, {
        $addToSet: { videos: videoId }
    });

    if (!updatePlayList) {
        throw new ApiError(400, "Playlist update failed");
    }

    return res.status(200).json(new ApiResponse(
        200,
        "Video added to playlist successfully",
        updatePlayList
    ));
});


const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    // TODO: remove video from playlist
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist or video id")
    }

    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId, {
        $pull: { videos: videoId }
    })
    if (!updatedPlaylist) {
        throw new ApiError(400, "Playlist update failed")
    }
    return res.status(200).json(new ApiResponse(
        200,
        "Video removed from playlist successfully",
        updatedPlaylist
    ))


})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    // TODO: delete playlist
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlist id")
    }

    const playlist = await Playlist.findById(playlistId)
    if(!playlist){
        throw new ApiError(404, "Playlist not found")
    }
    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId)
    if(!deletedPlaylist){
        throw new ApiError(400, "Playlist delete failed")
    }

    return res.status(200).json(new ApiResponse(
        200,
        "Playlist deleted successfully",
        deletedPlaylist
    ))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body
    //TODO: update playlist
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id")
    }

    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }
    if(!name || !description){
        throw new ApiError(400, "Name and description are required")
    }
    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId, {
        name,
        description
    }, { new: true })
    if (!updatedPlaylist) {
        throw new ApiError(400, "Playlist update failed")
    }

    return res.status(200).json(new ApiResponse(
        200,
        "Playlist updated successfully",
        updatedPlaylist
    ))
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}

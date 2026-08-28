import mongoose, { Schema, model } from 'mongoose';
import { ITag } from '../interfaces/tag.interface.js';



const tagModel = mongoose.models.tag || model('tag', tagSchema);

export default tagModel;

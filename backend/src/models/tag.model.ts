import mongoose, { Schema, model } from 'mongoose';
import { ITag } from '../interfaces/tag.interface.js';

const tagSchema: Schema<ITag> = new Schema<ITag>({
  tag_name: {
    type: String,
    default: ''
  }
});

const tagModel = mongoose.models.tag || model('tag', tagSchema);

export default tagModel;

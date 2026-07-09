import { getTrainerAvatarOption, isCustomTrainerAvatar } from '../game/trainerAvatars';

interface TrainerAvatarProps {
  avatar: string;
  className?: string;
  imageClassName?: string;
  emojiClassName?: string;
}

export default function TrainerAvatar({
  avatar,
  className = 'w-12 h-12 rounded-xl',
  imageClassName = 'w-full h-full object-cover rounded-xl',
  emojiClassName = 'text-2xl',
}: TrainerAvatarProps) {
  if (isCustomTrainerAvatar(avatar)) {
    return (
      <div className={`${className} overflow-hidden bg-gray-800`}>
        <img src={avatar} alt="训练师头像" className={imageClassName} />
      </div>
    );
  }

  const option = getTrainerAvatarOption(avatar);
  return (
    <div
      className={`${className} flex items-center justify-center`}
      style={{ backgroundColor: `${option?.color || '#64748b'}30` }}
    >
      <span className={emojiClassName}>{option?.emoji || '❓'}</span>
    </div>
  );
}

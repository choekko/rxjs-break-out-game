import React, { useEffect, useMemo } from 'react';
import VGameDisplay from 'features/display/vacs/VGameDisplay';
import { bind } from '@react-rxjs/core';
import { barBodyPositions$ } from 'features/physics/streams/barStream';
import { setGameStart, useGameStart } from 'features/display/StartButton';
import {
  ballDirectionX$,
  ballDirectionY$,
  ballPosition$,
  setBallDirectionX,
  setBallDirectionY,
  setHitTargetPosition,
} from 'features/physics/streams/ballStream';
import { BAR_SIZE, DISPLAY_SIZE } from 'constants/size';
import { Direction } from 'types/physics';
import { BALL_START_DIRECTION_X, BALL_START_DIRECTION_Y, BAR_POSITION_Y } from 'constants/initialValue';
import { blockPositions$ } from 'features/physics/streams/blockStream';

const [useBarBodyPositions] = bind(barBodyPositions$);
const [useBallPosition] = bind(ballPosition$);
const [useBallDirectionX] = bind(ballDirectionX$, 1);
const [useBallDirectionY] = bind(ballDirectionY$, 1);
const [useBlockPositions] = bind(blockPositions$);

interface HitInfo {
  hitDirection: 'hitX' | 'hitY' | 'hitCorner' | 'hitFloor';
  hitTargetPosition: [number, number];
}

function GameDisplay() {
  const isStarted = useGameStart();
  const barBodyPositions = useBarBodyPositions();
  const ballPosition = useBallPosition();
  const [ballPositionX, ballPositionY] = ballPosition;
  const ballDirectionX = useBallDirectionX();
  const ballDirectionY = useBallDirectionY();
  const blockPositions = useBlockPositions();

  const checkBallHit = (): HitInfo | null => {
    const leftMostXOfBar = barBodyPositions[0][0];
    const rightMostXOfBar = barBodyPositions[BAR_SIZE - 1][0];

    const nextBallPositionY = ballPositionY + ballDirectionY;
    const nextBallPositionX = ballPositionX + ballDirectionX;

    const hitsTopBottomWall = nextBallPositionY > DISPLAY_SIZE.HEIGHT - 1 || nextBallPositionY < 0;
    const hitsTopOfBar =
      leftMostXOfBar <= ballPositionX && ballPositionX <= rightMostXOfBar && nextBallPositionY === BAR_POSITION_Y;
    const hitsTopBottomOfBlock = blockPositions.some(([x, y]) => x === ballPositionX && y === nextBallPositionY);

    const hitsFloor = ballPositionY === 0;

    if (hitsFloor) {
      return {
        hitDirection: 'hitFloor',
        hitTargetPosition: [nextBallPositionX, nextBallPositionY],
      };
    }

    if (hitsTopBottomWall || hitsTopOfBar || hitsTopBottomOfBlock) {
      return {
        hitDirection: 'hitY',
        hitTargetPosition: [ballPositionX, nextBallPositionY],
      };
    }

    const hitsLeftRightWall = nextBallPositionX > DISPLAY_SIZE.WIDTH - 1 || nextBallPositionX < 0;
    const hitsSideOfBar =
      ballPositionY === BAR_POSITION_Y &&
      (nextBallPositionX === leftMostXOfBar || nextBallPositionX === rightMostXOfBar);
    const hitsCornerOfBar =
      nextBallPositionY === BAR_POSITION_Y &&
      ((nextBallPositionX === leftMostXOfBar && ballDirectionX === 1) ||
        (nextBallPositionX === rightMostXOfBar && ballDirectionX === -1));

    const hitsCornerOfBlock = blockPositions.some(([x, y]) => x === nextBallPositionX && y === nextBallPositionY);
    const hitsSideOfBlock = blockPositions.some(([x, y]) => x === nextBallPositionX && y === ballPositionY);

    if (hitsLeftRightWall || hitsSideOfBar || hitsSideOfBlock) {
      return {
        hitDirection: 'hitX',
        hitTargetPosition: [nextBallPositionX, ballPositionY],
      };
    }

    if (hitsCornerOfBar || hitsCornerOfBlock) {
      return {
        hitDirection: 'hitCorner',
        hitTargetPosition: [nextBallPositionX, nextBallPositionY],
      };
    }

    return null;
  };

  const hitInfo = useMemo(() => checkBallHit(), [ballPosition, ballDirectionY, ballDirectionX]);

  useEffect(() => {
    if (!isStarted) {
      setBallDirectionX(BALL_START_DIRECTION_X);
      setBallDirectionY(BALL_START_DIRECTION_Y);
      return;
    }

    if (hitInfo) {
      setHitTargetPosition(hitInfo.hitTargetPosition);

      switch (hitInfo.hitDirection) {
        case 'hitCorner':
          setBallDirectionY(-ballDirectionY as Direction);
          setBallDirectionX(-ballDirectionX as Direction);
          break;
        case 'hitY':
          setBallDirectionY(-ballDirectionY as Direction);
          break;
        case 'hitX':
          setBallDirectionX(-ballDirectionX as Direction);
          break;
        case 'hitFloor':
          setGameStart(false);
          return;
        default:
          break;
      }
    }
  }, [hitInfo, isStarted]);

  const positions = [...barBodyPositions, ballPosition, ...blockPositions];
  const hit = useMemo(() => Boolean(hitInfo?.hitDirection), [ballPosition]);

  return <VGameDisplay positions={positions} ballPosition={ballPosition} isStarted={isStarted} hit={hit} />;
}

export default GameDisplay;

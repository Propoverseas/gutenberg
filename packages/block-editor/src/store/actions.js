/**
 * External dependencies
 */
import { castArray, first } from 'lodash';

/**
 * WordPress dependencies
 */
import { getDefaultBlockName, createBlock } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import { select } from './controls';

const buildSelectors = ( store ) => ( ...selectors ) => {
	const buildSelector = ( selector ) => {
		return ( ...args ) => (
			select(
				store,
				selector,
				...args,
			)
		);
	};
	if ( selectors.length > 1 ) {
		return selectors.map( buildSelector );
	}
	if ( selectors.length === 1 ) {
		return buildSelector( selectors[ 0 ] );
	}
};

const buildCoreEditorSelectors = buildSelectors( 'core/editor' );

/**
 * Returns an action object used in signalling that blocks state should be
 * reset to the specified array of blocks, taking precedence over any other
 * content reflected as an edit in state.
 *
 * @param {Array} blocks Array of blocks.
 *
 * @return {Object} Action object.
 */
export function resetBlocks( blocks ) {
	return {
		type: 'RESET_BLOCKS',
		blocks,
	};
}

/**
 * Returns an action object used in signalling that blocks have been received.
 * Unlike resetBlocks, these should be appended to the existing known set, not
 * replacing.
 *
 * @param {Object[]} blocks Array of block objects.
 *
 * @return {Object} Action object.
 */
export function receiveBlocks( blocks ) {
	return {
		type: 'RECEIVE_BLOCKS',
		blocks,
	};
}

/**
 * Returns an action object used in signalling that the block attributes with
 * the specified client ID has been updated.
 *
 * @param {string} clientId   Block client ID.
 * @param {Object} attributes Block attributes to be merged.
 *
 * @return {Object} Action object.
 */
export function updateBlockAttributes( clientId, attributes ) {
	return {
		type: 'UPDATE_BLOCK_ATTRIBUTES',
		clientId,
		attributes,
	};
}

/**
 * Returns an action object used in signalling that the block with the
 * specified client ID has been updated.
 *
 * @param {string} clientId Block client ID.
 * @param {Object} updates  Block attributes to be merged.
 *
 * @return {Object} Action object.
 */
export function updateBlock( clientId, updates ) {
	return {
		type: 'UPDATE_BLOCK',
		clientId,
		updates,
	};
}

/**
 * Returns an action object used in signalling that the block with the
 * specified client ID has been selected, optionally accepting a position
 * value reflecting its selection directionality. An initialPosition of -1
 * reflects a reverse selection.
 *
 * @param {string}  clientId        Block client ID.
 * @param {?number} initialPosition Optional initial position. Pass as -1 to
 *                                  reflect reverse selection.
 *
 * @return {Object} Action object.
 */
export function selectBlock( clientId, initialPosition = null ) {
	return {
		type: 'SELECT_BLOCK',
		initialPosition,
		clientId,
	};
}

/**
 * Yields action objects used in signalling that the block preceding the given
 * clientId should be selected.
 *
 * @param {string} clientId Block client ID.
 */
export function* selectPreviousBlock( clientId ) {
	const previousBlockClientId = yield select(
		'core/editor',
		'getPreviousBlockClientId',
		clientId
	);

	yield selectBlock( previousBlockClientId, -1 );
}

/**
 * Yields action objects used in signalling that the block following the given
 * clientId should be selected.
 *
 * @param {string} clientId Block client ID.
 */
export function* selectNextBlock( clientId ) {
	const nextBlockClientId = yield select(
		'core/editor',
		'getNextBlockClientId',
		clientId
	);

	yield selectBlock( nextBlockClientId );
}

/**
 * Returns an action object used in signalling that a block multi-selection has started.
 *
 * @return {Object} Action object.
 */
export function startMultiSelect() {
	return {
		type: 'START_MULTI_SELECT',
	};
}

/**
 * Returns an action object used in signalling that block multi-selection stopped.
 *
 * @return {Object} Action object.
 */
export function stopMultiSelect() {
	return {
		type: 'STOP_MULTI_SELECT',
	};
}

/**
 * Returns an action object used in signalling that block multi-selection changed.
 *
 * @param {string} start First block of the multi selection.
 * @param {string} end   Last block of the multiselection.
 *
 * @return {Object} Action object.
 */
export function multiSelect( start, end ) {
	return {
		type: 'MULTI_SELECT',
		start,
		end,
	};
}

/**
 * Returns an action object used in signalling that the block selection is cleared.
 *
 * @return {Object} Action object.
 */
export function clearSelectedBlock() {
	return {
		type: 'CLEAR_SELECTED_BLOCK',
	};
}

/**
 * Returns an action object that enables or disables block selection.
 *
 * @param {boolean} [isSelectionEnabled=true] Whether block selection should
 *                                            be enabled.

 * @return {Object} Action object.
 */
export function toggleSelection( isSelectionEnabled = true ) {
	return {
		type: 'TOGGLE_SELECTION',
		isSelectionEnabled,
	};
}

/**
 * Returns an action object signalling that a blocks should be replaced with
 * one or more replacement blocks.
 *
 * @param {(string|string[])} clientIds                     Block client ID(s) to replace.
 * @param {(Object|Object[])} blocks                        Replacement block(s).
 * @param {?boolean}          ignoreAllowedBlocksValidation If true the blocks will replaced even if the replacement was not allowed e.g: because of allowed blocks restrictions.
 */
export function* replaceBlocks( clientIds, blocks, ignoreAllowedBlocksValidation = false ) {
	const createAction = () => ( {
		type: 'REPLACE_BLOCKS',
		clientIds: castArray( clientIds ),
		blocks: castArray( blocks ),
		time: Date.now(),
	} );
	if ( ignoreAllowedBlocksValidation ) {
		yield createAction();
		return;
	}
	const [
		canInsertBlockType,
		getBlockName,
		getBlockRootClientId,
	] =	buildCoreEditorSelectors( 'canInsertBlockType', 'getBlockName', 'getBlockRootClientId' );
	const rootClientId = getBlockRootClientId( first( clientIds ) );
	// Replace is valid if the new blocks can be inserted in the root block
	// or if we had a block of the same type in the position of the block being replaced.
	for ( let index = 0; index < blocks.length; index++ ) {
		const block = blocks[ index ];
		if ( ! ( yield canInsertBlockType( block.name, rootClientId ) ) ) {
			const clientIdToReplace = clientIds[ index ];
			const nameOfBlockToReplace = clientIdToReplace && ( yield getBlockName( clientIdToReplace ) );
			if ( ! nameOfBlockToReplace || nameOfBlockToReplace !== block.name ) {
				return;
			}
		}
	}
	yield createAction();
}

/**
 * Returns an action object signalling that a single block should be replaced
 * with one or more replacement blocks.
 *
 * @param {(string|string[])} clientId                      Block client ID to replace.
 * @param {(Object|Object[])} block                         Replacement block(s).
 * @param {?boolean}          ignoreAllowedBlocksValidation If true the block will be moved even if the move was not allowed e.g: because of allowed blocks restrictions.
 *
 * @return {Object} Action object.
 */
export function replaceBlock( clientId, block, ignoreAllowedBlocksValidation = false ) {
	return replaceBlocks( clientId, block, ignoreAllowedBlocksValidation );
}

/**
 * Higher-order action creator which, given the action type to dispatch creates
 * an action creator for managing block movement.
 *
 * @param {string} type Action type to dispatch.
 *
 * @return {Function} Action creator.
 */
function createOnMove( type ) {
	return ( clientIds, rootClientId ) => {
		return {
			clientIds: castArray( clientIds ),
			type,
			rootClientId,
		};
	};
}

export const moveBlocksDown = createOnMove( 'MOVE_BLOCKS_DOWN' );
export const moveBlocksUp = createOnMove( 'MOVE_BLOCKS_UP' );

/**
 * Returns an action object signalling that an indexed block should be moved
 * to a new index.
 *
 * @param  {?string} clientId                      The client ID of the block.
 * @param  {?string} fromRootClientId              Root client ID source.
 * @param  {?string} toRootClientId                Root client ID destination.
 * @param  {number}  index                         The index to move the block into.
 * @param {?boolean} ignoreAllowedBlocksValidation If true the block will be moved even if the move was not allowed e.g: because of allowed blocks restrictions.
 *
 * @return {Object} Action object.
 */
export function* moveBlockToPosition( clientId, fromRootClientId, toRootClientId, index, ignoreAllowedBlocksValidation = false ) {
	const createAction = () => ( {
		type: 'MOVE_BLOCK_TO_POSITION',
		fromRootClientId,
		toRootClientId,
		clientId,
		index,
	} );
	if ( ignoreAllowedBlocksValidation ) {
		return createAction();
	}
	const [
		canInsertBlockType,
		getBlockName,
		getTemplateLock,
	] = buildCoreEditorSelectors( 'canInsertBlockType', 'getBlockName', 'getTemplateLock' );

	const blockName = yield getBlockName( clientId );

	// If locking is equal to all on the original clientId (fromRootClientId) it is not possible to move the block to any other position.
	// In the other cases (locking !== all ), if moving inside the same block the move is always possible
	// if moving to other parent block, the move is possible if we can insert a block of the same type inside the new parent block.
	if (
		( yield getTemplateLock( fromRootClientId ) ) !== 'all' &&
		( fromRootClientId === toRootClientId || ( yield canInsertBlockType( blockName, toRootClientId ) ) )
	) {
		yield createAction();
	}
}

/**
 * Returns an action object used in signalling that a single block should be
 * inserted, optionally at a specific index respective a root block list.
 *
 * @param {Object}   block                         Block object to insert.
 * @param {?number}  index                         Index at which block should be inserted.
 * @param {?string}  rootClientId                  Optional root client ID of block list on which to insert.
 * @param {?boolean} updateSelection               If true block selection will be updated. If false, block selection will not change. Defaults to true.
 * @param {?boolean} ignoreAllowedBlocksValidation If true the block will be inserted even if the insertion was not allowed e.g: because of allowed blocks restrictions.
 *
 * @return {Object} Action object.
 */
export function insertBlock(
	block,
	index,
	rootClientId,
	updateSelection = true,
	ignoreAllowedBlocksValidation = false
) {
	return insertBlocks(
		[ block ],
		index,
		rootClientId,
		updateSelection,
		ignoreAllowedBlocksValidation
	);
}

/**
 * Returns an action object used in signalling that an array of blocks should
 * be inserted, optionally at a specific index respective a root block list.
 *
 * @param {Object[]} blocks                        Block objects to insert.
 * @param {?number}  index                         Index at which block should be inserted.
 * @param {?string}  rootClientId                  Optional root client ID of block list on which to insert.
 * @param {?boolean} updateSelection               If true block selection will be updated.  If false, block selection will not change. Defaults to true.
 * @param {?boolean} ignoreAllowedBlocksValidation If true the block will be inserted even if the insertion was not allowed e.g: because of allowed blocks restrictions.
 */
export function* insertBlocks(
	blocks,
	index,
	rootClientId,
	updateSelection = true,
	ignoreAllowedBlocksValidation = false
) {
	let allowedBlocks;
	if ( ignoreAllowedBlocksValidation ) {
		allowedBlocks = blocks;
	} else {
		allowedBlocks = [];
		const canInsertBlockType = buildCoreEditorSelectors( 'canInsertBlockType' );
		for ( const block of castArray( blocks ) ) {
			if ( block ) {
				const isValid = yield canInsertBlockType( block.name, rootClientId );
				if ( isValid ) {
					allowedBlocks.push( block );
				}
			}
		}
	}
	if ( allowedBlocks.length ) {
		yield {
			type: 'INSERT_BLOCKS',
			blocks: allowedBlocks,
			index,
			rootClientId,
			time: Date.now(),
			updateSelection,
		};
	}
}

/**
 * Returns an action object used in signalling that the insertion point should
 * be shown.
 *
 * @param {?string} rootClientId Optional root client ID of block list on
 *                               which to insert.
 * @param {?number} index        Index at which block should be inserted.
 *
 * @return {Object} Action object.
 */
export function showInsertionPoint( rootClientId, index ) {
	return {
		type: 'SHOW_INSERTION_POINT',
		rootClientId,
		index,
	};
}

/**
 * Returns an action object hiding the insertion point.
 *
 * @return {Object} Action object.
 */
export function hideInsertionPoint() {
	return {
		type: 'HIDE_INSERTION_POINT',
	};
}

/**
 * Returns an action object resetting the template validity.
 *
 * @param {boolean}  isValid  template validity flag.
 *
 * @return {Object} Action object.
 */
export function setTemplateValidity( isValid ) {
	return {
		type: 'SET_TEMPLATE_VALIDITY',
		isValid,
	};
}

/**
 * Returns an action object synchronize the template with the list of blocks
 *
 * @return {Object} Action object.
 */
export function synchronizeTemplate() {
	return {
		type: 'SYNCHRONIZE_TEMPLATE',
	};
}

/**
 * Returns an action object used in signalling that two blocks should be merged
 *
 * @param {string} firstBlockClientId  Client ID of the first block to merge.
 * @param {string} secondBlockClientId Client ID of the second block to merge.
 *
 * @return {Object} Action object.
 */
export function mergeBlocks( firstBlockClientId, secondBlockClientId ) {
	return {
		type: 'MERGE_BLOCKS',
		blocks: [ firstBlockClientId, secondBlockClientId ],
	};
}

/**
 * Yields action objects used in signalling that the blocks corresponding to
 * the set of specified client IDs are to be removed.
 *
 * @param {string|string[]} clientIds      Client IDs of blocks to remove.
 * @param {boolean}         selectPrevious True if the previous block should be
 *                                         selected when a block is removed.
 */
export function* removeBlocks( clientIds, selectPrevious = true ) {
	clientIds = castArray( clientIds );

	if ( selectPrevious ) {
		yield selectPreviousBlock( clientIds[ 0 ] );
	}

	yield {
		type: 'REMOVE_BLOCKS',
		clientIds,
	};
}

/**
 * Returns an action object used in signalling that the block with the
 * specified client ID is to be removed.
 *
 * @param {string}  clientId       Client ID of block to remove.
 * @param {boolean} selectPrevious True if the previous block should be
 *                                 selected when a block is removed.
 *
 * @return {Object} Action object.
 */
export function removeBlock( clientId, selectPrevious ) {
	return removeBlocks( [ clientId ], selectPrevious );
}

/**
 * Returns an action object used to toggle the block editing mode between
 * visual and HTML modes.
 *
 * @param {string} clientId Block client ID.
 *
 * @return {Object} Action object.
 */
export function toggleBlockMode( clientId ) {
	return {
		type: 'TOGGLE_BLOCK_MODE',
		clientId,
	};
}

/**
 * Returns an action object used in signalling that the user has begun to type.
 *
 * @return {Object} Action object.
 */
export function startTyping() {
	return {
		type: 'START_TYPING',
	};
}

/**
 * Returns an action object used in signalling that the user has stopped typing.
 *
 * @return {Object} Action object.
 */
export function stopTyping() {
	return {
		type: 'STOP_TYPING',
	};
}

/**
 * Returns an action object used in signalling that the caret has entered formatted text.
 *
 * @return {Object} Action object.
 */
export function enterFormattedText() {
	return {
		type: 'ENTER_FORMATTED_TEXT',
	};
}

/**
 * Returns an action object used in signalling that the user caret has exited formatted text.
 *
 * @return {Object} Action object.
 */
export function exitFormattedText() {
	return {
		type: 'EXIT_FORMATTED_TEXT',
	};
}

/**
 * Returns an action object used in signalling that a new block of the default
 * type should be added to the block list.
 *
 * @param {?Object} attributes   Optional attributes of the block to assign.
 * @param {?string} rootClientId Optional root client ID of block list on which
 *                               to append.
 * @param {?number} index        Optional index where to insert the default block
 *
 * @return {Object} Action object
 */
export function insertDefaultBlock( attributes, rootClientId, index ) {
	const block = createBlock( getDefaultBlockName(), attributes );

	return insertBlock( block, index, rootClientId );
}

/**
 * Returns an action object that changes the nested settings of a given block.
 *
 * @param {string} clientId Client ID of the block whose nested setting are
 *                          being received.
 * @param {Object} settings Object with the new settings for the nested block.
 *
 * @return {Object} Action object
 */
export function updateBlockListSettings( clientId, settings ) {
	return {
		type: 'UPDATE_BLOCK_LIST_SETTINGS',
		clientId,
		settings,
	};
}

/*
 * Returns an action object used in signalling that the editor settings have been updated.
 *
 * @param {Object} settings Updated settings
 *
 * @return {Object} Action object
 */
export function updateEditorSettings( settings ) {
	return {
		type: 'UPDATE_EDITOR_SETTINGS',
		settings,
	};
}

/**
 * Returns an action object used in signalling that a temporary reusable blocks have been saved
 * in order to switch its temporary id with the real id.
 *
 * @param {string} id        Reusable block's id.
 * @param {string} updatedId Updated block's id.
 *
 * @return {Object} Action object.
 */
export function __unstableSaveReusableBlock( id, updatedId ) {
	return {
		type: 'SAVE_REUSABLE_BLOCK_SUCCESS',
		id,
		updatedId,
	};
}

/**
 * Returns an action object used in signalling that the last block change should be marked explicitely as persistent.
 *
 * @return {Object} Action object.
 */
export function __unstableMarkLastChangeAsPersistent() {
	return { type: 'MARK_LAST_CHANGE_AS_PERSISTENT' };
}


/**
 * External dependencies
 */
import { get } from 'lodash';

/**
 * WordPress dependencies
 */
import { Fragment } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl, ExternalLink } from '@wordpress/components';
import { withSelect, withDispatch } from '@wordpress/data';
import { compose, ifCondition, withState } from '@wordpress/compose';
import { cleanForSlug } from '@wordpress/editor';
import { safeDecodeURIComponent } from '@wordpress/url';

/**
 * Module Constants
 */
const PANEL_NAME = 'post-link';

function PostLink( {
	isOpened,
	onTogglePanel,
	isEditable,
	postLink,
	permalinkParts,
	editPermalink,
	forceEmptyField,
	setState,
	postSlug,
} ) {
	const { prefix, suffix } = permalinkParts;
	let prefixElement, postNameElement, suffixElement;
	if ( isEditable ) {
		prefixElement = prefix && (
			<span className="edit-post-post-link__link-prefix">{ prefix }</span>
		);
		postNameElement = postSlug && (
			<span className="edit-post-post-link__link-post-name">{ postSlug }</span>
		);
		suffixElement = suffix && (
			<span className="edit-post-post-link__link-suffix">{ suffix }</span>
		);
	}

	return (
		<PanelBody
			title={ __( 'Permalink' ) }
			opened={ isOpened }
			onToggle={ onTogglePanel }
		>
			{ isEditable && (
				<div className="editor-post-link">
					<TextControl
						label={ __( 'URL Slug' ) }
						value={ forceEmptyField ? '' : postSlug }
						onChange={ ( newValue ) => {
							editPermalink( newValue );
							// When we delete the field the permalink gets
							// reverted to the original value.
							// The forceEmptyField logic allows the user to have
							// the field temporarily empty while typing.
							if ( ! newValue ) {
								if ( ! forceEmptyField ) {
									setState( {
										forceEmptyField: true,
									} );
								}
								return;
							}
							if ( forceEmptyField ) {
								setState( {
									forceEmptyField: false,
								} );
							}
						} }
						onBlur={ ( event ) => {
							editPermalink( cleanForSlug( event.target.value ) );
							if ( forceEmptyField ) {
								setState( {
									forceEmptyField: false,
								} );
							}
						} }
					/>
					<p>
						{ __( 'The last part of the URL. ' ) }
						<ExternalLink href="https://codex.wordpress.org/Posts_Add_New_Screen">
							{ __( 'Read about permalinks' ) }
						</ExternalLink>
					</p>
				</div>
			) }
			<p className="edit-post-post-link__preview-label">
				{ __( 'Preview' ) }
			</p>
			<ExternalLink
				className="edit-post-post-link__link"
				href={ postLink }
				target="_blank"
			>
				{ isEditable ?
					( <Fragment>
						{ prefixElement }{ postNameElement }{ suffixElement }
					</Fragment> ) :
					postLink
				}
			</ExternalLink>
		</PanelBody>
	);
}

export default compose( [
	withSelect( ( select ) => {
		const {
			isPermalinkEditable,
			getCurrentPost,
			isCurrentPostPublished,
			getPermalinkParts,
			getEditedPostAttribute,
			getEditedPostSlug,
		} = select( 'core/editor' );
		const {
			isEditorPanelEnabled,
			isEditorPanelOpened,
		} = select( 'core/edit-post' );
		const {
			getPostType,
		} = select( 'core' );

		const { link } = getCurrentPost();

		const postTypeName = getEditedPostAttribute( 'type' );
		const postType = getPostType( postTypeName );

		return {
			postLink: link,
			isEditable: isPermalinkEditable(),
			isPublished: isCurrentPostPublished(),
			isOpened: isEditorPanelOpened( PANEL_NAME ),
			permalinkParts: getPermalinkParts(),
			isEnabled: isEditorPanelEnabled( PANEL_NAME ),
			isViewable: get( postType, [ 'viewable' ], false ),
			postSlug: safeDecodeURIComponent( getEditedPostSlug() ),
		};
	} ),
	ifCondition( ( { isEnabled, postLink, isViewable, permalinkParts } ) => {
		return isEnabled && postLink && isViewable && permalinkParts;
	} ),
	withDispatch( ( dispatch ) => {
		const { toggleEditorPanelOpened } = dispatch( 'core/edit-post' );
		const { editPost } = dispatch( 'core/editor' );
		return {
			onTogglePanel: () => toggleEditorPanelOpened( PANEL_NAME ),
			editPermalink: ( newSlug ) => {
				editPost( { slug: newSlug } );
			},
		};
	} ),
	withState( {
		forceEmptyField: false,
	} ),
] )( PostLink );

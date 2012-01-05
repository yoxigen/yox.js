﻿(function($){
	$.fn.yoxview = function(options) 
	{
		if (this.length != 0)
		{
            var $this = $(this),
                view = $this.data("yoxview");

			if (typeof(options) === "string" && view && view[options]){
				return view[options].apply(view, Array.prototype.slice.call(arguments, 1));
            }
			else if (typeof options === 'object' || !options){
                $this.data("yoxview",$.yoxview.add(this, options));
            }
			else
			  $.error( 'Method ' +  options + ' does not exist on YoxView.' );
		}
		return this;
	};

    (function(){
        function styleSupport( prop ) {
            var vendorProp, supportedProp,
                capProp = prop.charAt(0).toUpperCase() + prop.slice(1),
                prefixes = [ "Moz", "Webkit", "O", "ms" ],
                div = document.createElement( "div" );

            if ( prop in div.style ) {
                supportedProp = prop;
            } else {
                for ( var i = 0; i < prefixes.length; i++ ) {
                    vendorProp = prefixes[i] + capProp;
                    if ( vendorProp in div.style ) {
                        supportedProp = vendorProp;
                        break;
                    }
                }
            }

            div = null;
            $.support[ prop ] = supportedProp;
            return supportedProp;
        }

        var transitionDuration = styleSupport("transitionDuration");
        if (transitionDuration && transitionDuration !== "transitionDuration") {
            $.cssHooks.transitionDuration = {
                get: function( elem, computed, extra ) {
                    return $.css( elem, transitionDuration );
                },
                set: function( elem, value) {
                    elem.style[ transitionDuration ] = value;
                }
            };
        }

        var transition = styleSupport("transition");
        if (transition && transition !== "transition") {
            $.cssHooks.transition = {
                get: function(elem, computed, extra){
                    return $.css(elem, transition);
                },
                set: function(elem, value){
                    elem.style[transition] = value;
                }
            };
        }
    })();

	function YoxView(container, id, options, cache){
		this.container = container;
		this.options = options;
		this.id = id;
        this.cache = cache;
        this.direction = 1;
		this.init();
	}

	YoxView.prototype = (function(){
        var dataSources = {};
        
        function onImageLoad(e){
            var view = e instanceof YoxView ? e : e.data.view,
                item = view.currentItem,
                position = view.getPosition(item);

            view.transition.call(view, position);
            view.triggerEvent("select", item);
        }

        var resizeCalculateFunctions = {
            fill: function(item){
                var newWidth = this.options.enlarge ? this.containerDimensions.width : Math.min(item.width, this.containerDimensions.width),
                    newHeight = Math.round(newWidth * item.ratio),
                    maxHeight = this.containerDimensions.height;

                if (newHeight < maxHeight && (maxHeight <= item.height || this.options.enlarge)){
                    newHeight = maxHeight;
                    newWidth = Math.round(newHeight / item.ratio);
                }

                return {
                    left: (this.containerDimensions.width - newWidth) / 2,
                    top: (this.containerDimensions.height - newHeight) / 2,
                    width: newWidth,
                    height: newHeight
                };
            },
            fit: function(item){
                var popupMargin = this.options.popupMargin,
                    popupPadding = this.options.popupPadding,
                    requiredWidth = this.containerDimensions.width - popupMargin.horizontal - popupPadding.horizontal,
                    newWidth =  this.options.enlarge ? requiredWidth : Math.min(item.width, requiredWidth),
                    newHeight = Math.round(newWidth * item.ratio),
                    maxHeight = this.containerDimensions.height - popupMargin.vertical - popupPadding.vertical;

                if (newHeight > maxHeight){
                    newHeight = maxHeight;
                    newWidth = Math.round(newHeight / item.ratio);
                }

                return {
                    left: (this.containerDimensions.width - newWidth) / 2 + (popupMargin.left - popupMargin.right) - popupPadding.left,
                    top: (this.containerDimensions.height - newHeight + (popupMargin.top - popupMargin.bottom)) / 2 - popupPadding.top,
                    width: newWidth,
                    height: newHeight
                };
            }
        };

        var transitions = {
            morph: (function(){
                var $frame,
                    panels,
                    currentPanelIndex = 1,
                    defaultTransitionTime,
                    currentTransitionTime;

                return {
                    create: function($container){
                        var view = this;
                        $frame = $("<div>", { "class": "yoxviewFrame yoxviewFrame_" + this.options.resizeMode + " yoxviewFrame_" + $.yoxview.platform}).appendTo($container);
                        if (this.options.transitionTime){
                            currentTransitionTime = this.options.transitionTime;
                            defaultTransitionTime = this.options.transitionTime;
                            $frame.css("transition", "all " + defaultTransitionTime + "ms ease-out");
                            if ($.browser.webkit)
                                $frame[0].style.setProperty("-webkit-transform", "translateZ(0)");
                        }

                        panels = [];
                        for(var i=0; i<2; i++){
                            var $img = $("<img>", { src: "", "class": "yoxviewImg" });
                            if (i > 0)
                                $img.css({opacity: "0"});

                            $img.css({ transition: ["all ", this.options.transitionTime, "ms ease-out"].join("") });
                            if ($.browser.webkit)
                                $img[0].style.setProperty("-webkit-transform", "translateZ(0)");

                            $img.on("load", { view: view }, onImageLoad);
                            panels.push($img.appendTo($frame));
                        }
                    },
                    getPanel: function(item){
                        currentPanelIndex = currentPanelIndex ? 0 : 1;
                        return panels[currentPanelIndex];
                    },
                    transition: function(position, time){
                        var panelCss = { opacity: currentPanelIndex },
                            frameCss = $.extend({}, position);

                        if (time !== undefined){
                            if (isNaN(time))
                                throw new TypeError("Invalid value for transition time, must be a number (in milliseconds).");
                        }
                        else
                            time = defaultTransitionTime;

                        if (time !== currentTransitionTime){
                            panelCss.transition = "opacity " + time + "ms ease-out";
                            frameCss.transition = "all " + time + "ms ease-out";
                            currentTransitionTime = time;
                        }

                        panels[1].css("opacity", currentPanelIndex);
                        $frame.css(frameCss);
                    }
                };
            })()
        };

        var keyboard = {
			map: {
	            40: 'down',
	            35: 'end',
	            13: 'enter',
	            36: 'home',
	            37: 'left',
	            39: 'right',
	            32: 'space',
	            38: 'up',
	            72: 'h',
	            27: 'escape'
			},
			onKeyDown: function(e){
                var view = e.data.view,
                    pK = keyboard.map[e.keyCode],
                    calledFunction = view[view.options.keyPress[pK]];

                if (calledFunction)
                {
                    e.preventDefault();
                    calledFunction.call(view);
                    return false;
                }

				return true;
			}
		};

        function createViewer(view){
            var elements = {};

            elements.$container = $(view.options.container);

            if (view.options.container === document.documentElement){
                elements.$background = $('<div class="yoxviewBackground"></div>').appendTo(document.body);
                elements.$background.on("click",
                    function(e){
                        view.triggerEvent("backgroundClick", e);
                    }
                );
            }
            else if (elements.$container.css("position") === "static")
                elements.$container.css("position", "relative");

            var transitionMode = typeof view.options.transition === "string" ? transitions[view.options.transition] : view.options.transition;
            if (!transitionMode)
                throw new Error("Invalid transition - \"" + view.options.transition + "\" doesn't exist.");

            transitionMode.create.call(view, elements.$container);
            $.extend(view, {
                getPanel: transitionMode.getPanel,
                transition: transitionMode.transition,
                getPosition: resizeCalculateFunctions[view.options.resizeMode],
                elements: elements
            });
        }

        return {
            addDataSource: function(dataSource){
                if (dataSources[dataSource.name])
                    return false;

                dataSources[dataSource.name] = dataSource;
            },
            addItems: function(items, createThumbnails){
                if (!items)
                    return false;

                if (!(items instanceof Array))
                    items = [items];

                this.triggerEvent("loadSources", { createThumbnails: createThumbnails, items: items });
            },
            addSources: function(sources){
                var deferredPromises = [],
                    self = this;

                if (sources && !(sources instanceof Array))
                    sources = [sources];

                for(var i=0; i<sources.length; i++){
                    var promise = this.loadSource(sources[i]);
                    if (promise)
                        deferredPromises.push(promise);
                }

                $.when.apply(this, deferredPromises).done(function () {
                    self.triggerEvent("loadSources", arguments);
                });
            },
            addEventListener: function(eventName, eventHandler){
                var self = this;
                if (!eventHandler || typeof(eventHandler) !== "function")
                    throw new Error("Invalid event handler, must be a function.");

                $(this.container).on(eventName + ".yoxview", $.proxy(eventHandler, self));
            },
            cacheCount: 0,
            disableKeyboard: function(){ $(document).off("keydown.yoxview", keyboard.onKeyDown); },
            enableKeyboard: function(){	$(document).on("keydown.yoxview", { view: this }, keyboard.onKeyDown); },
            first: function(){
				if (!this.currentItem)
					return false;

                this.selectItem(0);
			},
            items: [],
            init: function(){
                var self = this,
                    sources = [this.container],
                    optionsSource = this.options.source;

                if (optionsSource){
                    if (optionsSource instanceof Array)
                        sources = sources.concat(optionsSource);
                    else
                        sources.push(optionsSource);
                }

                this.options.popupMargin = utils.distributeMeasures(this.options.popupMargin);
                this.options.popupPadding = utils.distributeMeasures(this.options.popupPadding);

                // Init events:
                for(var eventName in this.options.events){
                    var eventHandlers = this.options.events[eventName];
                    if (eventHandlers instanceof Array){
                        for(var i=0; i < eventHandlers.length; i++){
                            self.addEventListener(eventName, eventHandlers[i]);
                        }
                    }
                    else
                        self.addEventListener(eventName, eventHandlers);
                }

                this.addSources(sources);

                createViewer(this);
                
                // Apply event handlers:
                if (this.options.handleThumbnailClick){
                    this.container.on("click.yoxview", "a:has('img')", function(e){
                        e.preventDefault();
                        self.triggerEvent("thumbnailClick", self.items[$(e.currentTarget).data("yoxviewIndex") - 1]);
                    });
                }

                if (this.options.selectedThumbnailClass)
                    this.addEventListener("beforeSelect", function(e, data){
                        if (data.oldItem)
                            $(data.oldItem.thumbnail.element).removeClass(this.options.selectedThumbnailClass);

                        $(data.newItem.thumbnail.element).addClass(this.options.selectedThumbnailClass);
                    });

                if (this.options.enableKeyboard)
                    this.enableKeyboard();

                if (this.options.controls){
                    for(var methodName in this.options.controls){
                        var method = this[methodName];
                        if (method){
                            $(this.options.controls[methodName])
                                .data("yoxviewControl", methodName)
                                .on("click", function(e){
                                    e.preventDefault(); self[$(this).data("yoxviewControl")].call(self);
                                });
                        }
                    }
                }
                this.update();
            },
            last: function(){
				if (!this.currentItem)
					return false;

                this.selectItem(this.items.length - 1);

			},
            loadSource: function(source){
                var self = this,
                    sourceIsObject = typeof(source) === "object",
                    sourceUrl = sourceIsObject ? source.url : source,
                    sourceOptions = sourceIsObject ? source : {},
                    onLoadSource = function(sourceData){ self.store(sourceUrl, sourceData); dfd.resolve(sourceData); };

                for(var dataSourceName in dataSources){
                    var dataSource = dataSources[dataSourceName];

                    if (dataSource.match(sourceUrl)){
                        var dfd = $.Deferred(),
                            savedSourceData = self.store(sourceUrl);

                        if (savedSourceData)
                            onLoadSource(savedSourceData);
                        else{
                            dataSource.load(sourceUrl, sourceOptions, onLoadSource,
                                function(error){
                                    dfd.reject();
                                }
                            )
                        }
                        return dfd;
                    }
                }
            },
            next: function(slideshow){
                if (!this.currentItem)
					return false;

                this.direction = 1;
				var nextItemId = this.currentItem.id === this.items.length ? 0 : this.currentItem.id;
				this.selectItem(nextItemId, undefined, slideshow);
            },
            toggleSlideshow: function(){
                var view = this;

                if (this.isPlaying){
                    clearTimeout(this.playTimeoutId);
                    this.isPlaying = false;
                    this.triggerEvent("slideshowStop");
                }
                else{
                    this.isPlaying = true;
                    this.playTimeoutId = setTimeout(function(){ view.next.call(view, true) }, this.options.slideshowDelay);
                    this.triggerEvent("slideshowStart");
                }
            },
            prev: function(){
                if (!this.currentItem)
					return false;

                this.direction = -1;
				var prevItemId = this.currentItem.id === 1 ? this.items.length - 1 : this.currentItem.id - 2;
				this.selectItem(prevItemId);
            },
            removeItems: function(){
                this.removeThumbnails();
                this.triggerEvent("removeItems", this.items);
                this.currentItem = undefined;
                this.items = [];
            },
            removeThumbnails: function(){
                var removedThumbnails = [];

                for(var i=0, count = this.items.length; i < count; i++){
                    var item = this.items[i];
                    if (item.thumbnail && item.thumbnail.generated){
                        removedThumbnails.push($(item.thumbnail.element).remove());
                        delete item.thumbnail.element;
                    }
                }
                this.triggerEvent("removeThumbnails", removedThumbnails);
            },
            removeEventListener: function(eventName, eventHandler){
                if (eventHandler && typeof(eventHandler) !== "function")
                    throw new Error("Invalid event handler, must be a function or undefined.");

                $(this.container).off(eventName + ".yoxview", eventHandler);
            },
            selectItem: function(item, data, slideshow){
                if (!slideshow && this.isPlaying)
                    this.toggleSlideshow();
                else if (slideshow && !this.isPlaying){
                    this.isPlaying = true;
                    this.triggerEvent("slideshowStart");
                }

                if (!isNaN(item)){
                    if (item >= this.items.length)
                        throw new Error("Invalid item index.");
                    
                    item = this.items[item];
                }
                else{
                    if (item instanceof HTMLElement)
                        item = $(item);

                    if (item instanceof jQuery){
                        item = this.items[item.data("yoxviewIndex") - 1];
                    }
                }

                var currentItem = this.currentItem,
                    view = this;

                if (currentItem && item.id === currentItem.id)
					return false;

                this.triggerEvent("beforeSelect", [{ newItem: item, oldItem: currentItem }, data]);
				this.currentItem = item;

                this.cache.withItem(item, this, function(){
                    var $panel = this.getPanel(true);
                    if ($panel.attr("src") !== item.url){
                        //$panel.callback = callback;
                        $panel.attr("src", item.url);
                        /*
                        if (window.chrome){ // This fixes a bug in Chrome 16, without it the second image doesn't show on the first run.
                            var otherPanel = elements.panels[currentPanelIndex === 1 ? 0 : 1];
                            if (!otherPanel.attr("src"))
                                otherPanel.attr("src", item.url);
                        }
                        */
                    }
                    else
                        onImageLoad.call($panel[0], this);
                });
            },
            source: function(sources){
                this.removeItems();
                this.addSources(sources);
            },
            store: function(key, data){
                if (!this.options.storeDataSources || !window.localStorage || typeof(key) !== "string")
                    return;

                var keyName = "yoxview.source." + key;

                if (!data){
                    var item = window.localStorage.getItem(keyName);
                    if (item)
                        return JSON.parse(item);

                    return;
                }
                window.localStorage.setItem(keyName, JSON.stringify(data));
            },
            triggerEvent: function(eventName, data){
                $(this.container).trigger(eventName + ".yoxview", data);
            },
            unload: function(){
                // SOON
            },
            update: function(){
                var self = this;
                if (this.options.transitionTime){
                    if (this.updateTransitionTimeoutId){
                        clearTimeout(this.updateTransitionTimeoutId);
                        this.updateTransitionTimeoutId = null;
                    }
                }
                var containerDimensions = { width: this.elements.$container.width(), height: this.elements.$container.height() };
                if (!this.containerDimensions || containerDimensions.width !== this.containerDimensions.width || containerDimensions.height !== this.containerDimensions.height){
                    this.containerDimensions = containerDimensions;
                    if (this.currentItem){
                        this.transition(this.getPosition(this.currentItem), 0);
                    }
                }
            }
        };
    })();

	$.yoxview = (function(){
		var views = [],
            platform = getPlatform(),
			isOpen = false,
			elements = {}, // $yoxviewPopup
			docElement = document.documentElement,
			currentView,
            currentViewSelectedThumbnailClass,
			currentPopupContainer,
			currentPopupContainerDimensions,
			currentPopupContainerIsDocElement,
			currentItem,
            thumbnailsActions = {
                createThumbnail: function(item){
                    var $thumbnail = $("<a>", {
                        href: item.link || item.url,
                        title: item.title,
                        data: { yoxviewIndex: item.id }
                    });

                    $thumbnail.append($("<img>", {
                        src: item.thumbnail.src,
                        alt: item.title
                    }));

                    return $thumbnail[0];
                }
            },
			config = {
                defaults: {
                    cacheImagesInBackground: true, // If true, full-size images are cached even while the gallery hasn't been opened yet.
                    createThumbnail: thumbnailsActions.createThumbnail, // A function that creates a thumbnail element when YoxView generates thumbnails. (Flickr, Picasa, etc.)
                    enableKeyPresses: true, // If set to false, YoxView won't catch any keyboard press events. To change individual keys, use keyPress.
                    enlarge: false, // Whether to enlarge images to fit the container
                    handleThumbnailClick: true, // Whether clicks on thumbnails should be handled. Set to false to implement clicks using the API.
                    keyPress: { left: "prev", right: "next", up: "prev", down: "next", escape: "close", home: "first", end: "last", enter: "toggleSlideshow" }, // Functions to apply on key presses
                    events: { // Predefined event handlers
                        backgroundClick: function(){ $.yoxview.close() },
                        init: function(){
                            views.push(this);
                            if (this.options.cacheImagesInBackground)
                                cache.cacheItem(this);

                            // Need to trigger init only once per view:
                            this.removeEventListener("init");
                        },
                        loadSources: function(e){
                            var documentFragment,
                                createItems = [],
                                view = this,
                                sources = Array.prototype.slice.call(arguments, 1),
                                originalNumberOfItems = view.items.length;
                            
                            for(var i=0; i < sources.length; i++){
                                var sourceData = sources[i];
                                if (sourceData.createThumbnails){
                                    documentFragment = document.createDocumentFragment();
                                    for(var j = 0, count = sourceData.items.length; j < count; j++){
                                        var item = sourceData.items[j],
                                            thumbnailEl = view.options.createThumbnail(item);
        
                                        $(thumbnailEl).data("yoxviewIndex", item.id);
                                        item.thumbnail.element = thumbnailEl;
                                        item.thumbnail.generated = true;

                                        var thumbnailImages = thumbnailEl.getElementsByTagName("img");
                                        if (thumbnailImages.length)
                                            item.thumbnail.image = thumbnailImages[0];
        
                                        documentFragment.appendChild(thumbnailEl);
                                    }
                                }
        
                                view.items = view.items.concat(sourceData.items);
                                createItems = createItems.concat(sourceData.items);
                            }
        
                            for(var i=originalNumberOfItems, count=view.items.length; i < count; i++){
                                var item = view.items[i];
                                item.id = i + 1;
                                if (item.thumbnail && item.thumbnail.element)
                                    $(item.thumbnail.element).data("yoxviewIndex", item.id);
                            }
        
                            if (documentFragment){
                                view.container[0].appendChild(documentFragment);
                                view.triggerEvent("createThumbnails", { items: createItems });
                            }

                            if (!view.initialized){
                                view.initialized = true;
                                view.triggerEvent("init");
                            }
                        },
                        select: function(e, item){
                            var view = this;
                            if (this.isPlaying)
                                this.playTimeoutId = setTimeout(function(){ view.next.call(view, true); }, this.options.slideshowDelay);
                        },
                        thumbnailClick: function(e, item){
                            e.preventDefault();
                            this.selectItem(item);
                        }
                    }, // A function to call when the popup's background is clicked. (Applies only in popup mode)
                    container: docElement, // The element in which the viewer is rendered. Defaults to the whole window.
                    resizeMode: "fit", // The mode in which to resize the item in the container - 'fit' (shows the whole item, resized to fit inside the container) or 'fill' (fills the entire container).
                    slideshowDelay: 3000, // Time in milliseconds to display each image when in slideshow
                    storeDataSources: false // Whether to save to localStorage (if available) external data sources data, so as not to fetch it each time YoxView loads.

                },
                mode: {
                    fill: {
                        enlarge: true,
                        popupMargin: 0,
                        popupPadding: 0
                    },
                    fit: {
                        transition: "morph"
                    }
                },
                platform: {
                    mobile: {
                        backgroundStyle: "background: Black",
                        cacheBuffer: 2, // The number of images to cache after the current image (directional, depends on the current viewing direction)
                        onBackgroundClick: null,
                        onBeforeOpen: function(){ window.scrollTo(0, 1); },
                        popupMargin: 0,
                        popupPadding: 0,
                        showInfo: true,
                        transitionTime: 0 // The time it takes to animate transitions between items or opening and closing.
                    },
                    regular: {
                        cacheBuffer: 5, // The number of images to cache after the current image (directional, depends on the current viewing direction)
                        popupMargin: 20, // the minimum margin between the popup and the window
                        popupPadding: 0,
                        showInfo: true,
                        transitionTime: 300 // The time it takes to animate transitions between items or opening and closing.
                    }
                }
			},
			$window = $(window);
        
		var viewActions = {
			// Closes the popup, resets the viewer.
			close: function(){
				if (!isOpen)
					return false;
					
				viewActions.resizeToThumbnail(currentItem.thumbnail.image, true);
				setTimeout(function(){ elements.$yoxviewPopup.hide(); }, currentView.options.transitionTime);
				
				if (currentView.options.enableKeyPresses)
					$.yoxview.keyPresses.disable();
				
		        currentView.triggerEvent("close");

                elements.$background.hide();
				currentView = currentPopupContainer = currentPopupContainerDimensions = currentViewSelectedThumbnailClass = currentPopupContainerIsDocElement = currentItem = null;
				isOpen = false;
				
				return true;
			},
			// Opens the popup; 1. Set the popup on the thumbnail, 2. Sets the current view and item, 3. Selects the specified item.
			// Params: e (object): { item (object): itemData, viewId (number): ID of the view to open.
			open: function(e){
                e = e || {};
                currentView = views[e.viewId || 0];
				if (!isOpen && false){
					currentView = views[e.viewId || 0];
					currentViewSelectedThumbnailClass = currentView.options.selectedThumbnailClass;

					if (!e.item)
						e.item = currentView.items[0];

                    viewActions.updatePopup();
					viewActions.resizeToThumbnail(e.item.thumbnail.image, false);
					
					currentPopupContainer = currentView.options.container;
					currentPopupContainerIsDocElement = currentPopupContainer === docElement;
					viewActions.setPopupContainerDimensions();
					viewActions.resizeStaticStyleTransitions = viewActions.resizeStaticStyleTransitionsDefault.replace(/TIME/g, currentView.options.transitionTime + "ms");
					


                    currentView.triggerEvent("beforeOpen", { item: e.item });

                    if (currentView.options.container === docElement)
                        elements.$background.show();
				}

                if (currentView.options.enableKeyPresses)
						$.yoxview.keyPresses.enable();
                
				currentView.selectItem(e.item);
			}
		};

        var cache = (function(){
            var currentCacheIndex,
                currentCacheCount = 0,
                concurrentCachedImagesCount = 2,
                cacheImages = [],
                currentCachedImageIndex = 0,
                innerKey = (new Date()).valueOf(),
                cachingCount = 0, // The number of currently loading images
                loadGracetime = 200,
                loadGracetimeTimeoutId,
                loadingItemId;
            
            for(var i=0; i<concurrentCachedImagesCount; i++){
                var cacheImage = new Image();
                $(cacheImage).on("load", { cacheImageIndex: i }, onLoadImage);
                cacheImages.push({ img: cacheImage });
            }

            function updateViewCacheAndAdvance(view, increaseCacheCount){
                var advance = true;
                currentCacheCount++;
                if (increaseCacheCount && (++view.cacheCount) === view.items.length){
                    delete view.cacheCount;
                    view.isLoaded = true;
                    advance = false;
                }

                if (advance)
                    advance = (currentCacheCount + cachingCount < view.options.cacheBuffer);

                if (advance)
                    advanceCache(view);
            }

            function endCache(item, view){
                view.triggerEvent("cacheEnd", item);
                loadingItemId = null;
            }

            function onLoadImage(e){
                var cacheImage = cacheImages[currentCachedImageIndex = e.data.cacheImageIndex],
                    item = cacheImage.item,
                    view = cacheImage.view;
                
                item.width = this.width;
                item.height = this.height;
                item.ratio = this.height / this.width;
                item.isLoaded = true;

                if (item.id === loadingItemId)
                    endCache(item, view);

                view.triggerEvent("loadItem", item);

                if (cacheImage.onCache)
                    cacheImage.onCache.call(view, item);

                cachingCount--;
                delete cacheImage.item;
                updateViewCacheAndAdvance(view, true);
            }

            function advanceCache(view){
                var itemsCount = view.items.length,
                    nextItemIndex = currentCacheIndex + view.direction;
                if (nextItemIndex === itemsCount)
                    nextItemIndex = 0;
                else if (nextItemIndex === -1)
                    nextItemIndex += itemsCount;

                cacheItem(view, view.items[nextItemIndex], null, innerKey);
            }

            function cacheItem(view, item, onCache){
                if (!(view instanceof YoxView))
                    throw new TypeError("Invalid view for cacheItem.");

                if (!view)
                    throw new Error("View is required for cacheItem.");

                // Reset current cache count for outside calls:
                if (arguments.length < 4 || arguments[3] !== innerKey){
                    currentCacheCount = 0;
                }

                item = item || view.items[0];

                // Check whether the specified item is already being cached:
                for(var i = 0; i < concurrentCachedImagesCount; i++){
                    var cacheImage = cacheImages[i];
                    if (cacheImage.view && cacheImage.view.id === view.id && cacheImage.item && cacheImage.item.id === item.id){
                        // If it is loading, add the onCache function to it:
                        cacheImage.onCache = onCache;
                        return true;
                    }
                }
                
                currentCacheIndex = item.id - 1;
                
                if (!item.isLoaded && item.type === "image"){
                    var cacheImage = cacheImages[currentCachedImageIndex];
                    cacheImage.item = item;
                    cacheImage.view = view;
                    cacheImage.img.src = "";
                    cacheImage.img.src = item.url;
                    cacheImage.onCache = onCache;
                    cachingCount++;

                    if (++currentCachedImageIndex === cacheImages.length)
                        currentCachedImageIndex = 0;

                    // Init another cache, if there are available slots:
                    if (cachingCount < concurrentCachedImagesCount && currentCacheCount + cachingCount < view.options.cacheBuffer)
                        advanceCache(view);
                }
                else{
                    updateViewCacheAndAdvance(view, !item.isLoaded);
                    item.isLoaded = true;
                }

                return true;
            }

            function withItem(item, view, onCache){
                // Reset current cache count for outside calls:
                if (arguments.length < 3 || arguments[2] !== innerKey)
                    currentCacheCount = 0;

                if (item.isLoaded){
                    onCache.call(view, item);

                    if (loadingItemId)
                        endCache(item, view);
                    
                    currentCacheIndex = item.id - 1;
                    if (!view.isLoaded){
                        updateViewCacheAndAdvance(view, false);
                    }
                }
                else{
                    if (loadGracetimeTimeoutId)
                        clearTimeout(loadGracetimeTimeoutId);
                    
                    loadGracetimeTimeoutId = setTimeout(function(){
                        if (!item.isLoaded){
                            loadGracetimeTimeoutId = null;
                            view.triggerEvent("cacheStart", item);
                            loadingItemId = item.id;
                        }
                    }, loadGracetime);

                    cacheItem(view, item, onCache, innerKey);
                }
            }

            return {
                cacheItem: cacheItem,
                withItem: withItem
            };
        })();

        function getPlatform(){
            var mobilePlatforms = /(Android)|(iPhone)|(iPod)/;

            // Consider the platform to be mobile if a predefined string in the userAgent is found or if the screen resolution is very small:
            return mobilePlatforms.test(navigator.userAgent) || (screen.width * screen.height < 400000) ? "mobile" : "regular";
        }


		return {
			add: function(container, options){
				var optionsEvents = $.extend({}, options.events);
                delete options.events;
                var viewOptions = $.extend(true, {}, config.defaults, config.platform[platform], options);
                viewOptions = $.extend(viewOptions, config.mode[viewOptions.resizeMode]);
                
                // Merge the options events with the default ones:
                for(var eventName in optionsEvents){
                    var eventHandlers = viewOptions.events[eventName],
                        events = optionsEvents[eventName];

                    if (!eventHandlers)
                        eventHandlers = viewOptions.events[eventName] = [];
                    else if (!(eventHandlers instanceof Array))
                        eventHandlers = viewOptions.events[eventName] = [eventHandlers];
                    
                    if (events instanceof Array)
                        eventHandlers = eventHandlers.concat(events);
                    else if (typeof events === "function")
                        eventHandlers.push(events);
                }

				return new YoxView(container, views.length, viewOptions, cache);
			},
			addDataSource: function(dataSource){
                YoxView.prototype.addDataSource(dataSource);
			},
            platform: platform
		}
	})();

    var utils = {
        distributeMeasures: function(original){
            var distributed = { top: 0, bottom: 0, left: 0, right: 0};

            if (original){
                var isNumber = typeof(original) === "number";

                for(var side in distributed){
                    distributed[side] = isNumber ? original : (original[side] || 0);
                }
            }
            distributed.horizontal = distributed.left + distributed.right;
            distributed.vertical = distributed.top + distributed.bottom;

            return distributed;
        }
    }

})(jQuery);
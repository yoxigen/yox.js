$.yoxview.addDataSource(function(){
	var dataSourceName = "picasa",
        picasaRegex = /^https?:\/\/picasaweb\.google\./,
        picasaMatchRegex = /https?:\/\/picasaweb\.google\.\w+\/([^\/#\?]+)\/?([^\/#\?]+)?(\?([^#]*))?/,
        apiUrl = "http://picasaweb.google.com/data/feed/api/",
        picasaCropSizes = [32, 48, 64, 72, 104, 144, 150, 160],
        picasaUncropSizes = [94, 110, 128, 200, 220, 288, 320, 400, 512, 576, 640, 720, 800, 912, 1024, 1152, 1280, 1440, 1600].concat(picasaCropSizes).sort(function(a,b){ return a-b; }),
        defaults = {
            setThumbnail: true,
            setSingleAlbumThumbnails: true,
            setTitle: true, // Whether to add a header with user and/or album name before thumbnails
			alt: 'json',
            cropThumbnails: false,
			thumbsize: 64,
            imgmax: picasaUncropSizes[picasaUncropSizes.length - 1],
            fields: "entry(summary),entry(media:group(media:thumbnail(@url))),entry(media:group(media:content(@url))),entry(media:group(media:content(@width))),entry(media:group(media:content(@height))),entry(link(@href))"
        };
    
    function getDataFromUrl(url, options){
        var urlMatch = url.match(picasaMatchRegex),
            data = $.extend({}, defaults, options);
        
        if (urlMatch && urlMatch.length > 1)
        {
            data.user = urlMatch[1];
            if (urlMatch[2]){
                data.album = urlMatch[2];
                data.fields += ",entry(summary),gphoto:name";
            }
            else
                data.fields += ",entry(title),entry(gphoto:numphotos)";
        }

        data.imgmax = getImgmax(picasaUncropSizes, data.imgmax);
        data.thumbsize = getImgmax(data.cropThumbnails ? picasaCropSizes : picasaUncropSizes, data.thumbsize) + (data.cropThumbnails ? "c" : "u");
        return data;
    }

    function getImgmax(picasaSizes, optionsImgmax){
        var imgmax = Math.min(optionsImgmax, Math.max(screen.width, screen.height));

        for(var i=picasaSizes.length, picasaSize; (i-- -1) && (picasaSize = picasaSizes[i]) && picasaSizes[i - 1] >= imgmax;){}
        return picasaSize;
    }

    function getFeedUrl(picasaData)
    {
        var feedUrl = apiUrl;
        if (picasaData.user && picasaData.user != "lh")
        {
            feedUrl += "user/" + picasaData.user;
            if (picasaData.album)
                feedUrl += "/album/" + picasaData.album;
        }
        else
            feedUrl += "all";

        return feedUrl;
    }

    function getImagesData(picasaData, kind)
    {
        var entry = picasaData.feed.entry,
            isAlbum = kind === "album",
            itemsData = [];

        jQuery.each(picasaData.feed.entry, function(i, image){
            var imageTitle = isAlbum ? image.title.$t + " (" + image.gphoto$numphotos.$t + " images)" : image.summary.$t,
                mediaData = image.media$group.media$content[0],
                itemData = {
                    thumbnail: {
                        src: image.media$group.media$thumbnail[0].url
                    },
                    url: mediaData.url,
                    link: image.link[1].href,
                    title: imageTitle,
                    type: "image",
                    width: mediaData.width,
                    height: mediaData.height,
                    ratio: mediaData.height / mediaData.width
                };

            if (isAlbum)
                itemData.data = { album: image.gphoto$name.$t };

            itemsData.push(itemData);
        });

        return itemsData;
    }

	return {
		name: dataSourceName,
		match: function(source){ return picasaRegex.test(source); },
		load: function(source, options, callback){
            var picasaData = getDataFromUrl(source, options);
console.log("picasaData: ", picasaData);
            $.ajax({
                url: getFeedUrl(picasaData),
                dataType: 'jsonp',
                data: picasaData,
                success: function(data)
                {
                    var returnData = {
                        source: source,
                        sourceType: dataSourceName
                    };

                    if (!data.feed.entry || data.feed.entry.length == 0){
                        returnData.items = [];
                    }
                    else{
                        var kind = data.feed.entry[0].gphoto$numphotos ? "album" : "other";

                        if (kind === "album")
                            $.extend(returnData, {
                                title: data.feed.title.$t,
                                createGroups: true
                            });

                        returnData.createThumbnails = true;
                        returnData.items = getImagesData(data, kind);
                    }

                    if (callback)
                        callback(returnData);
                },
                error : function(xOptions, textStatus){

                }
            });
	    }
    };
}());